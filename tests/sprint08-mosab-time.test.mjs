import assert from "node:assert/strict";
import { test } from "node:test";
import { NextResponse } from "next/server.js";
import { z } from "zod";
import { loadModule } from "./helpers/loadModule.mjs";
import * as salon from "../lib/salonTime.ts";

test("Pacific dates round-trip independently of the server timezone", () => {
  const original = process.env.TZ;
  try {
    for (const tz of ["UTC", "America/Los_Angeles"]) {
      process.env.TZ = tz;
      for (const [date, expected] of [
        ["2026-10-20", "2026-10-20T18:00:00.000Z"],
        ["2026-12-20", "2026-12-20T19:00:00.000Z"],
      ]) {
        const instant = salon.parseSalonDateTime(date, "11:00 AM");
        assert.equal(instant.toISOString(), expected);
        assert.equal(salon.formatSalonDate(instant), date);
        assert.equal(salon.formatSalonTime(instant), "11:00 AM");
      }
    }
  } finally {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  }
});

test("invalid dates/times and DST gaps/folds are rejected; day ranges follow DST", () => {
  for (const [date, time] of [
    ["2026-10-32", "11:00 AM"], ["2026-02-29", "11:00 AM"],
    ["2026-04-31", "11:00 AM"], ["2026-10-20", "13:00 PM"],
    ["2026-10-20", "11:60 AM"], ["2026-03-08", "2:30 AM"],
    ["2026-11-01", "1:30 AM"],
  ]) assert.equal(salon.parseSalonDateTime(date, time), null);
  assert.equal(salon.parseSalonDateTime("2028-02-29", "12:00 AM").toISOString(), "2028-02-29T08:00:00.000Z");
  for (const [date, hours] of [["2026-03-08", 23], ["2026-11-01", 25]]) {
    const range = salon.salonDayRange(date);
    assert.equal((range.end - range.start) / 3_600_000, hours);
    assert.equal(salon.formatSalonDate(range.start), date);
    assert.equal(salon.formatSalonTime(range.start), "12:00 AM");
  }
});

const schemas = loadModule("lib/validations/booking.ts", { mocks: { zod: { z } } });
const payload = {
  serviceIds: [1], stylistId: null, date: "2026-10-20", time: "11:00 AM",
  name: "Test", email: "test@example.com", phone: "5305550100",
};

test("public booking writes the Pacific instant and rejects impossible input before database work", async () => {
  const writes = [];
  const service = { id: 1, name: "Test", price: 20, durationMinutes: 30 };
  const { POST } = loadModule("app/api/bookings/route.ts", {
    mocks: {
      "next/server": { NextResponse }, "@/lib/salonTime": salon,
      "@/lib/validations/booking": schemas,
      "@/lib/bookingRateLimit": { bookingLimitResponse: async () => null },
      "@/lib/bookingReference": { createUniqueBookingReference: async () => "TEST-ONLY" },
      "@/lib/db": { db: {
        service: { findMany: async () => [service] },
        $transaction: async (callback) => callback({ appointment: { create: async ({ data }) => {
          writes.push(data); return { id: 1, ...data };
        } } }),
      } },
    },
    globals: { fetch: async () => ({ ok: true, json: async () => [{ time: "11:00 AM", available: true }] }) },
  });
  const request = (body) => ({ json: async () => body, nextUrl: { origin: "http://localhost" } });
  assert.equal((await POST(request(payload))).status, 201);
  assert.equal(writes[0].startTime.toISOString(), "2026-10-20T18:00:00.000Z");
  assert.equal(writes[0].endTime.toISOString(), "2026-10-20T18:30:00.000Z");
  assert.equal((await POST(request({ ...payload, date: "2026-10-32" }))).status, 400);
  assert.equal(writes.length, 1);
});

test("availability rejects impossible dates before loading settings or querying", async () => {
  const { GET } = loadModule("app/api/availability/times/route.ts", {
    mocks: {
      "next/server": { NextResponse }, "@/lib/db": { db: {} },
      "@/lib/salonTime": salon,
      "@/lib/availabilitySettings": {},
      "@/lib/appointmentStatus": { CANCELLED_STATUS: "cancelled", REJECTED_STATUS: "rejected" },
    },
  });
  assert.equal((await GET({ url: "http://localhost/api/availability/times?date=2026-10-32" })).status, 400);
});

test("fall-back availability omits both occurrences of ambiguous Pacific labels", async () => {
  const now = Date.parse("2026-10-20T12:00:00Z");
  class FixedDate extends Date {
    constructor(...args) { super(...(args.length ? args : [now])); }
    static now() { return now; }
  }
  const { GET } = loadModule("app/api/availability/times/route.ts", {
    mocks: {
      "next/server": { NextResponse },
      "@/lib/db": { db: {
        availabilityBlock: { findMany: async () => [] },
        appointment: { findMany: async () => [] },
      } },
      "@/lib/salonTime": salon,
      "@/lib/availabilitySettings": { getAvailabilitySettings: async () => ({
        businessHours: [{ dayOfWeek: 0, enabled: true, openMinutes: 0, closeMinutes: 180 }],
        schedulingRule: { minimumNoticeMinutes: 0, maximumAdvanceDays: 30, bufferMinutes: 0 },
      }) },
      "@/lib/appointmentStatus": { CANCELLED_STATUS: "cancelled", REJECTED_STATUS: "rejected" },
    },
    globals: { Date: FixedDate },
  });
  const response = await GET({ url: "http://localhost/api/availability/times?date=2026-11-01&duration=30" });
  assert.equal(response.status, 200);
  const slots = await response.json();
  assert.deepEqual(slots, ["12:00 AM", "12:30 AM", "2:00 AM", "2:30 AM"].map((time) => ({ time, available: true })));
  assert.equal(new Set(slots.map((slot) => slot.time)).size, slots.length);
  for (const slot of slots) assert.ok(salon.parseSalonDateTime("2026-11-01", slot.time));
});