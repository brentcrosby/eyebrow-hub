import assert from "node:assert/strict";
import { test } from "node:test";
import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server.js";
import { z } from "zod";
import { loadModule } from "./helpers/loadModule.mjs";
import * as salon from "../lib/salonTime.ts";
import * as closures from "../lib/bookingClosures.ts";
import { policy } from "./sprint09-mosab-policy-fixtures.mjs";

const status = loadModule("lib/appointmentStatus.ts");
const settings = {
  businessHours: Array.from({ length: 7 }, (_, dayOfWeek) => ({ dayOfWeek, enabled: true, openMinutes: 600, closeMinutes: 1200 })),
  schedulingRule: { minimumNoticeMinutes: 120, maximumAdvanceDays: 30, bufferMinutes: 15 },
};
const now = Date.parse("2026-10-20T15:00:00Z"); // 8 AM Pacific
class Clock extends Date {
  constructor(...args) { super(...(args.length ? args : [now])); }
  static now() { return now; }
}
const at = (time, date = "2026-10-20") => salon.parseSalonDateTime(date, time);

function fixture() {
  const rows = [];
  const blocks = [];
  const closed = [];
  const matches = (row, where) => row.startTime < where.startTime.lt && row.endTime > where.endTime.gt;
  const db = {
    businessHour: { findMany: async () => settings.businessHours },
    schedulingRule: { findUnique: async () => settings.schedulingRule },
    availabilityBlock: { findMany: async ({ where }) => blocks.filter((row) => matches(row, where)) },
    closure: { findMany: async ({ where }) => closed.filter((row) => matches(row, where)) },
    appointment: {
      findMany: async ({ where }) => rows.filter((row) => matches(row, where)),
      create: async ({ data }) => { const row = { id: rows.length + 1, ...data }; rows.push(row); return row; },
    },
    service: {
      findMany: async ({ where }) => where.id.in.map((id) => ({ id, name: "Fixture", price: 20, durationMinutes: 30 })),
      findFirst: async () => ({ id: 1, name: "Fixture", price: 20, durationMinutes: 30 }),
    },
    $transaction: async (callback) => callback(db),
  };
  const realPolicy = loadModule("lib/availabilitySettings.ts", { mocks: { "@/lib/db": { db }, "@/lib/salonTime": salon }, globals: { Date: Clock } });
  const reservation = loadModule("lib/bookingReservation.ts", { mocks: {
    "@prisma/client": { Prisma }, "@/lib/appointmentStatus": status,
    "@/lib/availabilitySettings": realPolicy, "@/lib/bookingClosures": closures,
  }, globals: { Date: Clock } });
  const schemas = loadModule("lib/validations/booking.ts", { mocks: { zod: { z } } });
  const manualSchema = loadModule("lib/validations/manualAppointment.ts", { mocks: { zod: { z }, "@/lib/appointmentStatus": status, "@/lib/validations/booking": schemas } });
  const mocks = {
    "next/server": { NextResponse }, "@prisma/client": { Prisma }, "@/lib/db": { db },
    "@/lib/salonTime": salon, "@/lib/availabilitySettings": realPolicy,
    "@/lib/bookingReservation": reservation, "@/lib/bookingClosures": closures,
    "@/lib/appointmentStatus": status, "@/lib/validations/booking": schemas,
    "@/lib/validations/manualAppointment": manualSchema,
    "@/lib/adminAuth": { requireAdmin: async () => ({ authenticated: true }) },
    "@/lib/appointmentSource": { MANUAL_SOURCE: "manual" },
    "@/lib/bookingRateLimit": { bookingLimitResponse: async () => null },
    "@/lib/bookingReference": { createUniqueBookingReference: async () => "FIXTURE-ONLY" },
  };
  const times = loadModule("app/api/availability/times/route.ts", { mocks, globals: { Date: Clock } }).GET;
  const fetch = (url) => times({ url });
  const globals = { Date: Clock, fetch };
  return {
    rows, blocks, closed, db, reservation,
    times, publicPost: loadModule("app/api/bookings/route.ts", { mocks, globals }).POST,
    manualPost: loadModule("app/api/admin/appointments/route.ts", { mocks, globals }).POST,
    validate: loadModule("app/api/bookings/validate/route.ts", { mocks, globals }).POST,
  };
}
const request = (time, extra = {}) => ({ nextUrl: { origin: "http://localhost" }, json: async () => ({
  date: "2026-10-20", time, stylistId: null, serviceIds: [1], serviceId: 1,
  name: "Fixture", email: "fixture@example.invalid", phone: "5550100100",
  customerName: "Fixture", customerPhone: "5550100100", ...extra,
}) });

test("offer, validation and both saves agree on hours, notice, grid and duration", async () => {
  for (const [time, allowed] of [["9:30 AM", false], ["10:00 AM", true], ["10:15 AM", false], ["7:30 PM", true], ["8:00 PM", false]]) {
    for (const path of ["publicPost", "manualPost"]) {
      const f = fixture();
      const slots = await (await f.times({ url: "http://localhost/api/availability/times?date=2026-10-20&duration=30" })).json();
      assert.equal(slots.some((slot) => slot.time === time && slot.available), allowed);
      assert.equal((await f.validate(request(time))).status, allowed ? 200 : 409);
      assert.equal((await f[path](request(time))).status, allowed ? 201 : 409);
    }
  }
  const start = at("10:00 AM");
  const end = at("10:30 AM");
  assert.equal(policy.isWithinSchedulingPolicy(start, end, settings, new Date(now)), true);
  assert.equal(policy.isWithinSchedulingPolicy(start, end, settings, new Date(now + 1)), false);
  assert.equal(policy.isWithinSchedulingPolicy(at("10:00 AM", "2026-11-19"), at("10:30 AM", "2026-11-19"), settings, new Date(now)), true);
  assert.equal(policy.isWithinSchedulingPolicy(at("10:00 AM", "2026-11-20"), at("10:30 AM", "2026-11-20"), settings, new Date(now)), false);
  assert.equal((await fixture().publicPost(request("7:30 PM", { serviceIds: [1, 2] }))).status, 409);
});

test("buffer edges, stale availability, normalized statuses and closures agree", async () => {
  for (const [end, allowed] of [["10:45 AM", true], ["10:46 AM", false], ["11:00 AM", false]]) {
    const f = fixture();
    f.rows.push({ startTime: at("10:00 AM"), endTime: at(end), status: "confirmed" });
    const slots = await (await f.times({ url: "http://localhost/api/availability/times?date=2026-10-20&duration=30" })).json();
    assert.equal(slots.find((slot) => slot.time === "11:00 AM").available, allowed);
    assert.equal((await f.manualPost(request("11:00 AM"))).status, allowed ? 201 : 409);
  }
  const f = fixture();
  assert.equal((await f.validate(request("11:00 AM"))).status, 200);
  f.closed.push({ startTime: at("11:00 AM"), endTime: at("12:00 PM") });
  assert.equal((await f.publicPost(request("11:00 AM"))).status, 409);
  assert.equal((await f.manualPost(request("11:00 AM"))).status, 409);
  assert.equal((await f.manualPost(request("12:00 PM"))).status, 201);
  const cancelled = fixture();
  cancelled.rows.push({ startTime: at("11:00 AM"), endTime: at("12:00 PM"), status: " CANCELED " });
  assert.equal((await cancelled.publicPost(request("11:00 AM", { serviceIds: [1, 2] }))).status, 201);
  assert.equal(cancelled.rows[1].endTime.getTime(), cancelled.rows[2].startTime.getTime());
});

test("cross-midnight buffer queries and blocked slots share the policy", async () => {
  const f = fixture();
  const midnight = at("12:00 AM");
  f.rows.push({ startTime: new Date(midnight.getTime() - 30 * 60_000), endTime: new Date(midnight.getTime() - 5 * 60_000), status: "confirmed" });
  const intervals = await f.reservation.getSchedulingIntervals(f.db, midnight, at("11:00 PM"), settings);
  assert.equal(intervals.length, 1);
  assert.equal(intervals[0].endTime.getTime(), midnight.getTime() + 10 * 60_000);
  const start = at("11:00 AM");
  const end = at("11:30 AM");
  f.blocks.push({ startTime: start, endTime: end });
  await assert.rejects(f.reservation.assertReservationAvailable(f.db, start, end, null));
  assert.equal((await f.validate(request("11:00 AM"))).status, 409);
});

test("PostgreSQL concurrent buffered groups and closures use the real policy", { skip: !process.env.DT571_TEST_DATABASE_URL }, async () => {
  const url = new URL(process.env.DT571_TEST_DATABASE_URL);
  assert.equal(url.hostname, "127.0.0.1");
  assert.equal(url.port, "55433");
  assert.equal(url.pathname, "/dt571_test");
  assert.equal(url.search, "");
  const { PrismaClient } = await import("@prisma/client");
  const { PrismaPg } = await import("@prisma/adapter-pg");
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url.toString() }) });
  const f = fixture();
  let service;
  let closure;
  try {
    service = await db.service.create({ data: { name: "DT601 synthetic", price: 20, durationMinutes: 30 } });
    const write = (time) => db.$transaction(async (tx) => {
      const start = at(time, "2031-10-20");
      const end = new Date(start.getTime() + 60 * 60_000);
      await f.reservation.assertReservationAvailable(tx, start, end, null, settings, new Date("2031-10-20T15:00:00Z"));
      for (let i = 0; i < 2; i++) await tx.appointment.create({ data: {
        serviceId: service.id, customerName: "Fixture", customerPhone: "5550100100", status: "confirmed",
        bookingReference: `DT601-${time}`, startTime: new Date(start.getTime() + i * 30 * 60_000), endTime: new Date(start.getTime() + (i + 1) * 30 * 60_000),
      } });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    const results = await Promise.allSettled([write("11:00 AM"), write("12:00 PM")]);
    assert.equal(results.filter((row) => row.status === "fulfilled").length, 1);
    for (const row of results.filter((row) => row.status === "rejected")) assert.equal(f.reservation.isReservationConflict(row.reason), true);
    assert.equal(await db.appointment.count({ where: { serviceId: service.id } }), 2);
    closure = await db.closure.create({ data: { closureDate: new Date("2031-10-20T00:00:00Z"), startTime: at("2:00 PM", "2031-10-20"), endTime: at("3:00 PM", "2031-10-20") } });
    await assert.rejects(write("2:00 PM"), (error) => f.reservation.isReservationConflict(error));
    assert.equal(await db.appointment.count({ where: { serviceId: service.id } }), 2);
  } finally {
    if (closure) await db.closure.delete({ where: { id: closure.id } });
    if (service) {
      await db.appointment.deleteMany({ where: { serviceId: service.id } });
      await db.service.delete({ where: { id: service.id } });
    }
    await db.$disconnect();
  }
});