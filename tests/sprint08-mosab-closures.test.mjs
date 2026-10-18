import assert from "node:assert/strict";
import { test } from "node:test";
import { NextResponse } from "next/server.js";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { loadModule } from "./helpers/loadModule.mjs";
import * as closures from "../lib/bookingClosures.ts";

const dateUtils = loadModule("lib/dateUtils.ts");
const status = loadModule("lib/appointmentStatus.ts");
const schemas = loadModule("lib/validations/booking.ts", { mocks: { zod: { z } } });
const manual = loadModule("lib/validations/manualAppointment.ts", { mocks: {
  zod: { z }, "@/lib/appointmentStatus": status, "@/lib/validations/booking": schemas,
} });
const day = "2026-12-20";
const at = (time) => dateUtils.parseDateTimeParams(day, time);
const interval = (start, end) => ({ startTime: at(start), endTime: at(end) });

function fixture(saved) {
  let rows = saved;
  let writes = 0;
  const service = { id: 1, active: true, name: "Test", price: 20, durationMinutes: 30 };
  const db = {
    closure: { findMany: async () => rows },
    availabilityBlock: { findMany: async () => [] },
    appointment: {
      findMany: async () => [],
      create: async ({ data }) => { writes++; return { id: writes, ...data }; },
    },
    service: { findMany: async () => [service], findFirst: async () => service },
    stylist: { findFirst: async () => ({ id: 1, active: true }) },
    $transaction: async (callback) => callback(db),
  };
  const mocks = {
    "next/server": { NextResponse }, "@/lib/db": { db },
    "@/lib/bookingClosures": closures, "@/lib/dateUtils": dateUtils,
    "@/lib/appointmentStatus": status, "@prisma/client": { Prisma },
    "@/lib/validations/booking": schemas, "@/lib/validations/manualAppointment": manual,
    "@/lib/bookingRateLimit": { bookingLimitResponse: async () => null },
    "@/lib/bookingReference": { createUniqueBookingReference: async () => "TEST-ONLY" },
    "@/lib/adminAuth": { requireAdmin: async () => ({ authenticated: true }) },
    "@/lib/appointmentSource": { MANUAL_SOURCE: "manual" },
    "@/lib/availabilitySettings": { getAvailabilitySettings: async () => ({
      businessHours: Array.from({ length: 7 }, (_, dayOfWeek) => ({
        dayOfWeek, enabled: true, openMinutes: 600, closeMinutes: 840,
      })),
      schedulingRule: { maximumAdvanceDays: 365, minimumNoticeMinutes: 0, bufferMinutes: 0 },
    }) },
  };
  const globals = { fetch: async () => ({ ok: true, json: async () => [{ time: "11:00 AM", available: true }] }) };
  const publicRoute = loadModule("app/api/bookings/route.ts", { mocks, globals });
  const manualRoute = loadModule("app/api/admin/appointments/route.ts", { mocks });
  const times = loadModule("app/api/availability/times/route.ts", { mocks });
  const request = (body) => ({ json: async () => body, nextUrl: { origin: "http://localhost" } });
  return {
    publicPost: () => publicRoute.POST(request({ serviceIds: [1], stylistId: 1, date: day, time: "11:00 AM",
      name: "Test", email: "test@example.com", phone: "5305550100" })),
    manualPost: () => manualRoute.POST(request({ serviceId: 1, stylistId: 1, date: day, time: "11:00 AM",
      customerName: "Test", customerPhone: "5305550100" })),
    slots: async () => (await times.GET({ url: `http://localhost/api/availability/times?date=${day}&duration=30` })).json(),
    remove: () => { rows = []; }, writes: () => writes,
  };
}

test("full-day and partial-day closures reject both direct create routes without writes", async () => {
  for (const saved of [interval("12:00 AM", "11:59 PM"), interval("10:30 AM", "11:30 AM")]) {
    const f = fixture([saved]);
    for (const response of [await f.publicPost(), await f.manualPost()]) {
      assert.equal(response.status, 409);
      assert.equal((await response.json()).success, false);
    }
    assert.equal(f.writes(), 0);
  }
});

test("exact closure edges remain bookable in both create routes", async () => {
  for (const saved of [interval("10:00 AM", "11:00 AM"), interval("11:30 AM", "12:00 PM")]) {
    const f = fixture([saved]);
    assert.equal((await f.publicPost()).status, 201);
    assert.equal((await f.manualPost()).status, 201);
    assert.equal(f.writes(), 2);
  }
});

test("availability blocks saved closures and removing them restores slots", async () => {
  const f = fixture([interval("11:00 AM", "12:00 PM")]);
  const before = await f.slots();
  assert.equal(before.find((s) => s.time === "11:00 AM").available, false);
  assert.equal(before.find((s) => s.time === "10:30 AM").available, true);
  assert.equal(before.find((s) => s.time === "12:00 PM").available, true);
  f.remove();
  assert.equal((await f.slots()).find((s) => s.time === "11:00 AM").available, true);
});