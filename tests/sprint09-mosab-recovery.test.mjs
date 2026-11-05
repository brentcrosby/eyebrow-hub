import assert from "node:assert/strict";
import { test } from "node:test";
import { randomUUID } from "node:crypto";
import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { NextResponse } from "next/server.js";
import { z } from "zod";
import { loadModule } from "./helpers/loadModule.mjs";
import { legacySchedulingMocks } from "./sprint09-mosab-policy-fixtures.mjs";
import * as salonTime from "../lib/salonTime.ts";
import * as bookingClosures from "../lib/bookingClosures.ts";
import { PACIFIC_BOOKING_CASES, CANONICAL_STATUS_CASES, bookingPayload, bookingRequest } from "./fixtures/sprint09-bookings.mjs";

const status = loadModule("lib/appointmentStatus.ts");
const reservation = loadModule("lib/bookingReservation.ts", { mocks: {
  ...legacySchedulingMocks,
  "@prisma/client": { Prisma }, "@/lib/appointmentStatus": status,
} });
const schemas = loadModule("lib/validations/booking.ts", { mocks: { zod: { z } } });

test("shared fixtures round-trip Pacific DST instants and cover every canonical status", () => {
  for (const fixture of PACIFIC_BOOKING_CASES) {
    const instant = salonTime.parseSalonDateTime(fixture.date, fixture.time);
    assert.equal(instant.toISOString(), fixture.utc);
    assert.equal(salonTime.formatSalonDate(instant), fixture.date);
    assert.equal(salonTime.formatSalonTime(instant), fixture.time);
  }
  assert.equal(salonTime.parseSalonDateTime("2026-11-01", "1:30 AM"), null);
  assert.equal(salonTime.parseSalonDateTime("2026-03-08", "2:30 AM"), null);
  const range = salonTime.salonDayRange("2026-11-01");
  assert.equal((range.end - range.start) / 3_600_000, 25);
  for (const fixture of CANONICAL_STATUS_CASES) {
    assert.equal(!status.isInactive(fixture.status), fixture.blocks);
  }
  assert.equal(status.isInactive(" CANCELED "), true);
});

const url = process.env.DT_SPRINT09_TEST_DATABASE_URL;
test("PostgreSQL preserves Pacific instants, canonical status conflicts and atomic recovery", {
  skip: !url,
}, async () => {
  // Deliberately refuse shared/team databases, including URLs with schema overrides.
  const parsed = new URL(url);
  assert.ok(["postgres:", "postgresql:"].includes(parsed.protocol));
  assert.equal(parsed.hostname, "127.0.0.1");
  assert.equal(parsed.port, "55434");
  assert.equal(parsed.pathname, "/sprint09_test");
  assert.equal(parsed.search, "");
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  const name = `DT602-${randomUUID()}`;
  const services = [];
  let stylist;
  function route(client = db) {
    return loadModule("app/api/bookings/route.ts", {
      mocks: {
        "next/server": { NextResponse }, "@prisma/client": { Prisma },
        "@/lib/db": { db: client }, "@/lib/bookingReservation": reservation,
        "@/lib/bookingClosures": bookingClosures, "@/lib/salonTime": salonTime,
        "@/lib/validations/booking": schemas,
        "@/lib/bookingRateLimit": { bookingLimitResponse: async () => null },
        "@/lib/bookingReference": { createUniqueBookingReference: async () => randomUUID() },
      },
      // Isolate persistence from offer-time rules: these tests intentionally replay
      // historical dates and overnight DST instants, not customer bookable slots.
      globals: { fetch: async () => ({ ok: true, json: async () =>
        [...new Set(PACIFIC_BOOKING_CASES.map((f) => f.time))].map((time) => ({ time, available: true })) }) },
    }).POST;
  }
  const clear = () => db.appointment.deleteMany({ where: { serviceId: { in: services.map((s) => s.id) } } });
  try {
    for (let i = 0; i < 2; i++) services.push(await db.service.create({ data: { name, price: 20, durationMinutes: 30 } }));
    stylist = await db.stylist.create({ data: { name } });
    const post = route();
    const payload = (overrides = {}) => bookingPayload({ serviceIds: [services[0].id], name, ...overrides });
    for (const stylistId of [null, stylist.id]) {
      for (const fixture of PACIFIC_BOOKING_CASES) {
        await clear();
        const response = await post(bookingRequest(payload({ stylistId, date: fixture.date, time: fixture.time })));
        assert.equal(response.status, 201);
        const body = await response.json();
        const row = await db.appointment.findUniqueOrThrow({ where: { id: body.booking.id } });
        assert.equal(row.startTime.toISOString(), fixture.utc);
        assert.equal(row.endTime.getTime() - row.startTime.getTime(), 30 * 60_000);
        assert.equal(row.stylistId, stylistId);
        assert.equal(body.booking.startTime, fixture.utc);
      }
    }
    for (const fixture of CANONICAL_STATUS_CASES) {
      await clear();
      await db.appointment.create({ data: {
        serviceId: services[0].id, stylistId: null, customerName: name, customerPhone: "5550100100",
        startTime: new Date("2026-12-01T19:00:00Z"), endTime: new Date("2026-12-01T19:30:00Z"), status: fixture.status,
      } });
      const response = await post(bookingRequest(payload()));
      assert.equal(response.status, fixture.blocks ? 409 : 201, fixture.status);
      if (fixture.blocks) assert.ok((await response.json()).errors.time.length > 0);
    }
    await clear();
    for (const conflict of [false, true]) {
      let inserts = 0;
      const failingDb = { service: db.service, stylist: db.stylist,
        $transaction: (callback, options) => db.$transaction(async (tx) => {
          const appointment = new Proxy(tx.appointment, { get(target, key) {
            if (key !== "create") return target[key];
            return async (args) => {
              if (++inserts === 2) {
                if (conflict) throw new reservation.ReservationConflictError("Injected conflict");
                throw new Error("Injected second-service failure");
              }
              return target.create(args);
            };
          } });
          return callback(new Proxy(tx, { get(target, key) { return key === "appointment" ? appointment : target[key]; } }));
        }, options),
      };
      const response = await route(failingDb)(bookingRequest(payload({ serviceIds: services.map((s) => s.id) })));
      assert.equal(response.status, conflict ? 409 : 500);
      assert.equal(inserts, 2, "failure occurs after one real database insert");
      assert.equal(await db.appointment.count({ where: { serviceId: { in: services.map((s) => s.id) } } }), 0);
      if (conflict) assert.ok((await response.json()).errors.time.length > 0);
    }
    const response = await post(bookingRequest(payload({ serviceIds: services.map((s) => s.id) })));
    assert.equal(response.status, 201, "a clean retry succeeds after rollback");
    const rows = await db.appointment.findMany({ where: { serviceId: { in: services.map((s) => s.id) } }, orderBy: { startTime: "asc" } });
    assert.equal(rows.length, 2);
    assert.equal(rows[0].bookingReference, rows[1].bookingReference);
    assert.equal(rows[0].endTime.getTime(), rows[1].startTime.getTime());
  } finally {
    await clear();
    if (stylist) await db.stylist.delete({ where: { id: stylist.id } });
    await db.service.deleteMany({ where: { id: { in: services.map((s) => s.id) } } });
    await db.$disconnect();
  }
});