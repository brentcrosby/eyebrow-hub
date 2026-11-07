// DT-592: creating a closure lists the bookings it affects and never changes
// them; deleting it makes the time bookable again.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { NextResponse } from "next/server.js";
import { loadModule } from "./helpers/loadModule.mjs";
import { legacySchedulingMocks } from "./sprint09-mosab-policy-fixtures.mjs";
import * as salonTime from "../lib/salonTime.ts";

const status = loadModule("lib/appointmentStatus.ts");
const pacific = loadModule("lib/pacificTimeInput.ts", { mocks: { "@/lib/salonTime": salonTime } });
const conflicts = loadModule("lib/closureConflicts.ts", {
  mocks: { "@/lib/appointmentStatus": status, "@/lib/salonTime": salonTime },
});
const reservation = loadModule("lib/bookingReservation.ts", {
  mocks: { ...legacySchedulingMocks, "@prisma/client": { Prisma }, "@/lib/appointmentStatus": status },
});

function loadRoutes(db) {
  const mocks = {
    "next/server": { NextResponse },
    "@prisma/client": { Prisma },
    "@/lib/db": { db },
    "@/lib/adminAuth": { requireAdmin: async () => ({ authenticated: true }) },
    "@/lib/salonTime": salonTime,
    "@/lib/pacificTimeInput": pacific,
    "@/lib/bookingReservation": reservation,
    "@/lib/closureConflicts": conflicts,
  };
  const list = loadModule("app/api/admin/closures/route.ts", { mocks });
  const byId = loadModule("app/api/admin/closures/[id]/route.ts", { mocks });
  return {
    post: (body) => list.POST({ json: async () => body }),
    get: (start, end) =>
      list.GET({ nextUrl: new URL(`http://localhost/api/admin/closures?start=${start}&end=${end}`) }),
    remove: (id) => byId.DELETE({}, { params: Promise.resolve({ id: String(id) }) }),
  };
}

const DAY = "2026-12-20";
const at = (time, date = DAY) => salonTime.parseSalonDateTime(date, time);
const overlaps = (row, where) =>
  (!where?.startTime?.lt || row.startTime < where.startTime.lt) &&
  (!where?.endTime?.gt || row.endTime > where.endTime.gt);

function memoryDb(appointments = []) {
  let closures = [];
  const appointmentWrites = [];
  const transactions = [];
  const forbidden = (name) => async () => {
    appointmentWrites.push(name);
    throw new Error(`appointment.${name} must not be called`);
  };
  const db = {
    closure: {
      findMany: async ({ where } = {}) =>
        closures.filter((row) =>
          where?.closureDate
            ? row.closureDate >= where.closureDate.gte && row.closureDate < where.closureDate.lt
            : overlaps(row, where)
        ),
      findFirst: async ({ where }) => closures.find((row) => overlaps(row, where)) ?? null,
      create: async ({ data }) => {
        const row = { id: closures.length + 1, ...data };
        closures = [...closures, row];
        return row;
      },
      deleteMany: async ({ where }) => {
        const before = closures.length;
        closures = closures.filter((row) => row.id !== where.id);
        return { count: before - closures.length };
      },
    },
    appointment: {
      findMany: async ({ where }) =>
        appointments
          .filter((row) => overlaps(row, where))
          .map((row) => structuredClone(row))
          .sort((a, b) => a.startTime - b.startTime || a.id - b.id),
      create: forbidden("create"),
      update: forbidden("update"),
      updateMany: forbidden("updateMany"),
      delete: forbidden("delete"),
      deleteMany: forbidden("deleteMany"),
    },
    availabilityBlock: { findMany: async () => [] },
    $transaction: async (callback, options) => {
      transactions.push(options);
      return callback(db);
    },
  };
  return { db, appointmentWrites, transactions, closures: () => closures };
}

const booking = (id, start, end, bookingStatus, name = `Fixture ${id}`) => ({
  id,
  startTime: at(start),
  endTime: at(end),
  customerName: name,
  status: bookingStatus,
  service: { name: "Eyebrow" },
});

const FIXTURE_APPOINTMENTS = [
  booking(1, "10:30 AM", "11:00 AM", "confirmed", "Fixture Confirmed"),
  booking(2, "11:30 AM", "11:45 AM", "pending", "Fixture Pending"),
  booking(3, "10:00 AM", "10:30 AM", "cancelled"),
  booking(4, "11:00 AM", "11:30 AM", "rejected"),
  booking(5, "10:45 AM", "11:15 AM", " Canceled "),
  // Touching a closure edge is not an overlap (same rule as booking enforcement).
  booking(6, "9:30 AM", "10:00 AM", "confirmed"),
  booking(7, "12:00 PM", "12:30 PM", "confirmed"),
];

test("a closure with no bookings inside returns an empty follow-up list", async () => {
  const f = memoryDb([booking(9, "9:00 AM", "9:30 AM", "confirmed")]);
  const response = await loadRoutes(f.db).post({ date: DAY, fullDay: false, startTime: "10:00", endTime: "12:00" });
  assert.equal(response.status, 201);
  const body = await response.json();
  assert.deepEqual(body.affectedAppointments, []);
  assert.equal(body.reason, null);
  assert.equal(f.transactions.length, 1);
  assert.equal(f.transactions[0].isolationLevel, Prisma.TransactionIsolationLevel.Serializable);
});

test("overlapping pending/confirmed bookings are listed in Pacific time; cancelled/rejected are excluded", async () => {
  const f = memoryDb(FIXTURE_APPOINTMENTS);
  const response = await loadRoutes(f.db).post({
    date: DAY, fullDay: false, startTime: "10:00", endTime: "12:00", reason: "Staff training",
  });
  assert.equal(response.status, 201);
  const body = await response.json();
  assert.equal(body.reason, "Staff training");
  assert.deepEqual(body.affectedAppointments, [
    {
      id: 1, startTime: "2026-12-20T18:30:00.000Z", endTime: "2026-12-20T19:00:00.000Z",
      date: DAY, time: "10:30 AM", customerName: "Fixture Confirmed", service: "Eyebrow", status: "confirmed",
    },
    {
      id: 2, startTime: "2026-12-20T19:30:00.000Z", endTime: "2026-12-20T19:45:00.000Z",
      date: DAY, time: "11:30 AM", customerName: "Fixture Pending", service: "Eyebrow", status: "pending",
    },
  ]);

  // A full-day closure lists every active booking that day, including edges.
  const fullDay = memoryDb(FIXTURE_APPOINTMENTS);
  const all = await (await loadRoutes(fullDay.db).post({ date: DAY, fullDay: true })).json();
  assert.deepEqual(all.affectedAppointments.map((a) => a.id), [6, 1, 2, 7]);
});

test("the follow-up list is still returned for each closure after a reload", async () => {
  const f = memoryDb([
    ...FIXTURE_APPOINTMENTS,
    { ...booking(8, "3:00 PM", "3:30 PM", "confirmed"), startTime: at("3:00 PM", "2026-12-21"), endTime: at("3:30 PM", "2026-12-21") },
  ]);
  const routes = loadRoutes(f.db);
  await routes.post({ date: DAY, fullDay: false, startTime: "10:00", endTime: "12:00" });
  await routes.post({ date: "2026-12-21", fullDay: true });
  await routes.post({ date: "2026-12-22", fullDay: true });

  const response = await routes.get("2026-12-20", "2026-12-23");
  assert.equal(response.status, 200);
  const listed = await response.json();
  assert.deepEqual(listed.map((c) => c.affectedAppointments.map((a) => a.id)), [[1, 2], [8], []]);
});

test("creating and deleting closures never changes appointments", async () => {
  const f = memoryDb(FIXTURE_APPOINTMENTS);
  const before = structuredClone(FIXTURE_APPOINTMENTS);
  const routes = loadRoutes(f.db);
  const created = await (await routes.post({ date: DAY, fullDay: true })).json();
  assert.equal((await routes.remove(created.id)).status, 204);
  assert.deepEqual(f.appointmentWrites, []);
  assert.deepEqual(FIXTURE_APPOINTMENTS, before);
});

test("deleting a closure makes the time bookable again under booking enforcement", async () => {
  const f = memoryDb([]);
  const routes = loadRoutes(f.db);
  const start = at("10:30 AM");
  const end = at("11:00 AM");

  await reservation.assertReservationAvailable(f.db, start, end, null);
  const created = await (await routes.post({ date: DAY, fullDay: false, startTime: "10:00", endTime: "12:00" })).json();
  await assert.rejects(
    reservation.assertReservationAvailable(f.db, start, end, null),
    reservation.ReservationConflictError
  );
  assert.equal((await routes.remove(created.id)).status, 204);
  await reservation.assertReservationAvailable(f.db, start, end, null);
  assert.equal((await routes.remove(created.id)).status, 404);
});

test("overlapping closures and serialization failures return 409; other failures return 500", async () => {
  const f = memoryDb([]);
  const routes = loadRoutes(f.db);
  assert.equal((await routes.post({ date: DAY, fullDay: false, startTime: "10:00", endTime: "12:00" })).status, 201);
  const overlap = await routes.post({ date: DAY, fullDay: false, startTime: "11:00", endTime: "13:00" });
  assert.equal(overlap.status, 409);
  assert.match((await overlap.json()).error, /overlaps an existing closure/);
  assert.equal(f.closures().length, 1);

  const raced = memoryDb([]);
  raced.db.$transaction = async () => {
    throw new Prisma.PrismaClientKnownRequestError("serialization failure", { code: "P2034", clientVersion: "test" });
  };
  const conflict = await loadRoutes(raced.db).post({ date: DAY, fullDay: true });
  assert.equal(conflict.status, 409);
  assert.match((await conflict.json()).error, /same moment/);

  const broken = memoryDb([]);
  broken.db.$transaction = async () => { throw new Error("database offline"); };
  const originalError = console.error;
  console.error = () => {};
  try {
    assert.equal((await loadRoutes(broken.db).post({ date: DAY, fullDay: true })).status, 500);
  } finally {
    console.error = originalError;
  }
});

test("invalid and DST-ambiguous closure times are still rejected", async () => {
  const f = memoryDb([]);
  const routes = loadRoutes(f.db);
  for (const body of [
    { date: "2026-11-01", fullDay: false, startTime: "01:30", endTime: "03:00" },
    { date: DAY, fullDay: false, startTime: "12:00", endTime: "10:00" },
    { date: DAY, fullDay: "yes" },
    { date: "2026-13-01", fullDay: true },
  ]) {
    assert.equal((await routes.post(body)).status, 400, JSON.stringify(body));
  }
  assert.equal(f.closures().length, 0);
});

test("the Availability page shows the follow-up list for each closure", () => {
  const page = readFileSync(new URL("../app/admin/(panel)/availability/page.tsx", import.meta.url), "utf8");
  assert.match(page, /affectedAppointments/);
  assert.match(page, /data-closure-follow-up/);
  assert.match(page, /were not changed/);
});

const url = process.env.DT_SPRINT09_TEST_DATABASE_URL;
test("PostgreSQL: two overlapping closures saved together give one 201 and one 409, bookings untouched", {
  skip: !url,
}, async () => {
  // Only the disposable CI database; never a shared team database.
  const parsed = new URL(url);
  assert.ok(["postgres:", "postgresql:"].includes(parsed.protocol));
  assert.equal(parsed.hostname, "127.0.0.1");
  assert.equal(parsed.port, "55434");
  assert.equal(parsed.pathname, "/sprint09_test");
  assert.equal(parsed.search, "");

  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  const marker = `DT592-${randomUUID()}`;
  const date = "2031-03-12";
  let service;
  const cleanUp = async () => {
    await db.closure.deleteMany({ where: { reason: marker } });
    await db.appointment.deleteMany({ where: { customerName: marker } });
    if (service) await db.service.delete({ where: { id: service.id } });
  };
  try {
    service = await db.service.create({ data: { name: marker, price: 0, durationMinutes: 30 } });
    const appointment = (time, bookingStatus) => db.appointment.create({ data: {
      serviceId: service.id, customerName: marker, customerPhone: "5550100100", status: bookingStatus,
      startTime: salonTime.parseSalonDateTime(date, time),
      endTime: new Date(salonTime.parseSalonDateTime(date, time).getTime() + 30 * 60_000),
    } });
    const confirmed = await appointment("11:00 AM", "confirmed");
    await appointment("11:30 AM", "cancelled");
    const before = await db.appointment.findMany({ where: { customerName: marker }, orderBy: { id: "asc" } });

    const routes = loadRoutes(db);
    for (let round = 0; round < 3; round++) {
      const responses = await Promise.all([
        routes.post({ date, fullDay: false, startTime: "10:00", endTime: "12:00", reason: marker }),
        routes.post({ date, fullDay: false, startTime: "11:00", endTime: "13:00", reason: marker }),
      ]);
      assert.deepEqual(responses.map((r) => r.status).sort(), [201, 409], `round ${round}`);
      const winner = await responses.find((r) => r.status === 201).json();
      assert.deepEqual(winner.affectedAppointments.map((a) => a.id), [confirmed.id]);
      assert.equal(await db.closure.count({ where: { reason: marker } }), 1);
      assert.equal((await routes.remove(winner.id)).status, 204);
    }

    const after = await db.appointment.findMany({ where: { customerName: marker }, orderBy: { id: "asc" } });
    assert.deepEqual(after, before);
  } finally {
    await cleanUp();
    await db.$disconnect();
  }
});
