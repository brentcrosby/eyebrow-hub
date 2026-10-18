import assert from "node:assert/strict";
import { test } from "node:test";
import { Prisma, PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { NextResponse } from "next/server.js";
import { z } from "zod";
import { randomUUID } from "node:crypto";
import { loadModule } from "./helpers/loadModule.mjs";

const url = process.env.DT571_TEST_DATABASE_URL;
test("PostgreSQL public/public, public/manual and manual/manual races; atomic multi-service writes", {
  skip: !url,
}, async () => {
  const parsed = new URL(url);
  assert.equal(parsed.hostname, "127.0.0.1");
  assert.equal(parsed.port, "55433");
  assert.equal(parsed.pathname, "/dt571_test");
  const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: url }) });
  const status = loadModule("lib/appointmentStatus.ts");
  const schemas = loadModule("lib/validations/booking.ts", { mocks: { zod: { z } } });
  const reservation = loadModule("lib/bookingReservation.ts", { mocks: {
    "@prisma/client": { Prisma }, "@/lib/appointmentStatus": status,
  } });
  const manual = loadModule("lib/validations/manualAppointment.ts", { mocks: {
    zod: { z }, "@/lib/appointmentStatus": status, "@/lib/validations/booking": schemas,
  } });
  const services = [];
  let stylist;
  const name = `DT571-${randomUUID()}`;
  let day = 1;
  try {
    services.push(await db.service.create({ data: { name, price: 20, durationMinutes: 30 } }));
    services.push(await db.service.create({ data: { name, price: 20, durationMinutes: 30 } }));
    stylist = await db.stylist.create({ data: { name } });
    const mocks = {
      "next/server": { NextResponse }, "@prisma/client": { Prisma }, "@/lib/db": { db },
      "@/lib/bookingReservation": reservation, "@/lib/appointmentStatus": status,
      "@/lib/dateUtils": loadModule("lib/dateUtils.ts"),
      "@/lib/validations/booking": schemas, "@/lib/validations/manualAppointment": manual,
      "@/lib/adminAuth": { requireAdmin: async () => ({ authenticated: true }) },
      "@/lib/appointmentSource": { MANUAL_SOURCE: "manual" },
      "@/lib/bookingRateLimit": { bookingLimitResponse: async () => null },
      "@/lib/bookingReference": { createUniqueBookingReference: async () => randomUUID() },
    };
    const globals = { fetch: async () => ({ ok: true, json: async () => [{ time: "11:00 AM", available: true }] }) };
    const publicPost = loadModule("app/api/bookings/route.ts", { mocks, globals }).POST;
    const manualPost = loadModule("app/api/admin/appointments/route.ts", { mocks }).POST;
    const request = (ids = [services[0].id], date = `2030-01-${String(day).padStart(2, "0")}`) => ({
      nextUrl: { origin: "http://localhost" },
      json: async () => ({ serviceIds: ids, serviceId: ids[0], stylistId: stylist.id, date, time: "11:00 AM",
        name, email: "fixture@example.com", phone: "5305550100", customerName: name, customerPhone: "5305550100" }),
    });
    for (const routes of [[publicPost, publicPost, publicPost], [publicPost, manualPost, publicPost], [manualPost, manualPost, manualPost]]) {
      for (let repeat = 0; repeat < 3; repeat++) {
        const responses = await Promise.all(routes.map((post) => post(request())));
        assert.deepEqual(responses.map((r) => r.status).sort(), [201, 409, 409]);
        for (const response of responses.filter((r) => r.status === 409)) {
          assert.ok((await response.json()).errors.time);
        }
        day++;
      }
    }
    assert.equal(await db.appointment.count({ where: { stylistId: stylist.id } }), 9);
    const ids = services.map((s) => s.id);
    const multi = await Promise.all([publicPost(request(ids)), publicPost(request(ids))]);
    assert.deepEqual(multi.map((r) => r.status).sort(), [201, 409]);
    assert.equal(await db.appointment.count({ where: { stylistId: stylist.id } }), 11);
    day++;
    // Inject a failure only after the first real insert; PostgreSQL must roll it back.
    const failingDb = { service: db.service, stylist: db.stylist };
    failingDb.$transaction = (callback, options) => db.$transaction(async (tx) => {
      let creates = 0;
      const wrapped = { availabilityBlock: tx.availabilityBlock, appointment: { findMany: tx.appointment.findMany, create: async (args) => {
        if (++creates === 2) throw new reservation.ReservationConflictError();
        return tx.appointment.create(args);
      } } };
      return callback(wrapped);
    }, options);
    const failingPost = loadModule("app/api/bookings/route.ts", {
      mocks: { ...mocks, "@/lib/db": { db: failingDb } }, globals,
    }).POST;
    assert.equal((await failingPost(request(ids))).status, 409);
    assert.equal(await db.appointment.count({ where: { stylistId: stylist.id } }), 11);
    assert.equal((await manualPost(request(ids, "2030-02-30"))).status, 400);
  } finally {
    if (stylist) {
      await db.appointment.deleteMany({ where: { stylistId: stylist.id } });
      await db.stylist.delete({ where: { id: stylist.id } });
    }
    await db.service.deleteMany({ where: { id: { in: services.map((s) => s.id) } } });
    await db.$disconnect();
  }
});