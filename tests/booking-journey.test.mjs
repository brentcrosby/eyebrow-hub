import assert from "node:assert/strict";
import { test } from "node:test";
import { NextResponse } from "next/server.js";
import { z } from "zod";
import React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { loadModule } from "./helpers/loadModule.mjs";
import { formatPacificDateTime } from "../lib/manageBooking.ts";
import { isBookingAlreadyCancelled, isBookingCancellable, matchesBookingPhone } from "../lib/bookingAccess.ts";
import { CANCELLED_STATUS } from "../lib/appointmentStatus.ts";

const reference = "0123456789ABCDEF";
const phone = "5305550100";
const services = [
  { id: 1, name: "Brow", price: 25, durationMinutes: 30 },
  { id: 2, name: "Lip", price: 20, durationMinutes: 30 },
];
const accessSchema = loadModule("lib/validations/bookingAccess.ts", { mocks: { zod: { z } } });
const creationSchema = loadModule("lib/validations/booking.ts", { mocks: { zod: { z } } });
const limited = { bookingLimitResponse: async () => null };
const request = (body) => ({ json: async () => body, nextUrl: { origin: "https://example.invalid" } });

function fixture(salon = null) {
  const rows = [];
  let writes = 0;
  const tx = {
    appointment: {
      create: async ({ data }) => {
        const row = { ...data, id: rows.length + 1, service: { name: services.find((s) => s.id === data.serviceId).name }, stylist: null };
        rows.push(row);
        writes++;
        return row;
      },
      findMany: async ({ where }) => rows.filter((row) => row.bookingReference === where.bookingReference)
        .sort((a, b) => a.startTime - b.startTime),
      updateMany: async ({ where, data }) => {
        const targets = rows.filter((row) => row.bookingReference === where.bookingReference && where.id.in.includes(row.id) && where.status.in.includes(row.status));
        targets.forEach((row) => { row.status = data.status; });
        writes += targets.length;
        return { count: targets.length };
      },
      count: async ({ where }) => rows.filter((row) => row.bookingReference === where.bookingReference).length,
    },
  };
  const db = {
    service: { findMany: async () => services },
    $transaction: async (callback) => callback(tx),
  };
  const common = { "next/server": { NextResponse }, "@/lib/db": { db }, "@/lib/bookingRateLimit": limited };
  const customer = loadModule("lib/customerBooking.ts", { mocks: { "@/lib/bookingAccess": { matchesBookingPhone } } });
  const creation = () => loadModule("app/api/bookings/route.ts", {
    mocks: {
      ...common,
      "@/lib/validations/booking": creationSchema,
      "@/lib/bookingReference": { createUniqueBookingReference: async () => reference },
      ...(salon ? { "@/lib/salonTime": salon } : {}),
    },
    globals: { fetch: async () => ({ ok: true, json: async () => [{ time: "10:00 AM", available: true }] }) },
  }).POST;
  const lookup = loadModule("app/api/bookings/lookup/route.ts", {
    mocks: { ...common, "@/lib/validations/bookingAccess": accessSchema, "@/lib/customerBooking": customer },
  }).POST;
  const cancel = loadModule("app/api/bookings/cancel/route.ts", {
    mocks: {
      ...common,
      "@prisma/client": { Prisma: { TransactionIsolationLevel: { Serializable: "Serializable" }, PrismaClientKnownRequestError: class extends Error {} } },
      "@/lib/validations/bookingAccess": accessSchema,
      "@/lib/customerBooking": customer,
      "@/lib/bookingAccess": { isBookingAlreadyCancelled, isBookingCancellable },
      "@/lib/appointmentStatus": { CANCELLED_STATUS },
    },
  }).POST;
  return { rows, create: (body) => creation()(request(body)), lookup: (body) => lookup(request(body)), cancel: (body) => cancel(request(body)), writes: () => writes };
}

function calendar(booking) {
  let blob;
  const anchor = { click() {} };
  let index = 0;
  const { default: BookingContainer } = loadModule("components/BookingContainer.tsx", {
    mocks: {
      react: {
        ...React,
        useState(initial) { const i = index++; return [i === 0 ? "confirmation" : i === 16 ? booking : initial, () => {}]; },
        useRef: (initial) => ({ current: initial }), useEffect() {},
      },
      "react/jsx-runtime": jsxRuntime,
      "next/link": { default: (props) => React.createElement("a", props) },
      "./Dropdown": {}, "./BookingForm": { default: () => null },
      "@/lib/validations/booking": { BOOKING_LIMITS: { services: 4 }, bookingSelectionSchema: {} },
      "@/lib/dateUtils": { toDateParam: () => booking.date },
    },
    globals: {
      document: { createElement: () => anchor, body: { appendChild() {}, removeChild() {} } },
      Blob, URL: { createObjectURL(value) { blob = value; return "blob:fixture"; }, revokeObjectURL() {} },
    },
  });
  const tree = BookingContainer();
  const button = React.Children.toArray(tree.props.children).find((child) => child.type === "button" && child.props.children === "Add to Calendar");
  assert.ok(button);
  button.props.onClick();
  return blob.text();
}

test("two services share one reference and PDT/PST creation, lookup and calendar agree under UTC and Pacific hosts", async () => {
  const salon = await import("../lib/salonTime.ts");
  const original = process.env.TZ;
  try {
    for (const tz of ["UTC", "America/Los_Angeles"]) {
      process.env.TZ = tz;
      for (const [date, iso, zone] of [
        ["2026-10-20", "2026-10-20T17:00:00.000Z", "PDT"],
        ["2026-12-20", "2026-12-20T18:00:00.000Z", "PST"],
      ]) {
        const f = fixture(salon);
        const created = await f.create({ serviceIds: [1, 2], stylistId: null, date, time: "10:00 AM", name: "Fixture", email: "fixture@example.invalid", phone });
        assert.equal(created.status, 201);
        const booking = (await created.json()).booking;
        assert.equal(booking.bookingReference, reference);
        assert.deepEqual(f.rows.map((row) => row.bookingReference), [reference, reference]);
        assert.equal(booking.startTime, iso);
        assert.equal(f.rows[0].endTime.toISOString(), f.rows[1].startTime.toISOString());
        const lookedUp = await f.lookup({ bookingReference: reference, phone });
        assert.equal(lookedUp.status, 200);
        const summary = (await lookedUp.json()).booking;
        assert.equal(summary.bookingReference, reference);
        assert.equal(summary.startTime, booking.startTime);
        assert.equal(summary.endTime, booking.endTime);
        assert.equal(summary.services.length, 2);
        assert.match(formatPacificDateTime(summary.services[0].startTime), new RegExp(`10:00 AM ${zone}`));
        assert.match(formatPacificDateTime(summary.services[1].startTime), new RegExp(`10:30 AM ${zone}`));
        const ics = (await calendar(booking)).replace(/\r\n[ \t]/g, "");
        assert.ok(ics.includes(`DTSTART:${iso.replace(/[-:]/g, "").replace(/\.000/, "")}`));
        assert.ok(ics.includes(`DTEND:${booking.endTime.replace(/[-:]/g, "").replace(/\.000/, "")}`));
      }
    }
  } finally {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  }
});

test("controlled lookup rejects malformed, unknown and wrong-phone credentials without leaking the group", async () => {
  const f = fixture();
  const start = new Date("2026-12-20T18:00:00.000Z");
  f.rows.push(...services.map((service, index) => ({
    id: service.id,
    bookingReference: reference,
    customerPhone: phone,
    status: "pending",
    startTime: new Date(start.getTime() + index * 30 * 60_000),
    endTime: new Date(start.getTime() + (index + 1) * 30 * 60_000),
    service: { name: service.name },
    stylist: null,
  })));
  const valid = await f.lookup({ bookingReference: reference, phone });
  assert.equal(valid.status, 200);
  assert.equal((await valid.json()).booking.services.length, 2);
  const notFound = { success: false, error: "Booking not found" };
  for (const credentials of [
    { bookingReference: "invalid", phone },
    { bookingReference: "FFFFFFFFFFFFFFFF", phone },
    { bookingReference: reference, phone: "5305559999" },
  ]) {
    const response = await f.lookup(credentials);
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), notFound);
    assert.equal(response.headers.get("Cache-Control"), "no-store");
  }
  assert.equal(f.rows.length, 2);
  assert.equal(f.writes(), 0);
});

test("controlled cancellation updates both eligible rows; denies exact cutoff and ineligible groups without writes", async () => {
  const f = fixture();
  const start = new Date(Date.now() + 48 * 60 * 60_000);
  const row = (id, status, offset) => ({ id, bookingReference: reference, customerPhone: phone, status, startTime: new Date(start.getTime() + offset), endTime: new Date(start.getTime() + offset + 30 * 60_000), service: { name: services[id - 1].name }, stylist: null });
  f.rows.push(row(1, "pending", 0), row(2, "confirmed", 30 * 60_000));
  const credentials = { bookingReference: reference, phone };
  const denied = await f.cancel({ bookingReference: reference, phone: "5305559999" });
  assert.equal(denied.status, 404);
  assert.equal(f.writes(), 0);
  f.rows[1].status = "completed";
  assert.equal((await f.cancel(credentials)).status, 409);
  assert.equal(f.writes(), 0);
  f.rows[1].status = "confirmed";
  // Check the exact boundary without a timing-sensitive live handler call.
  assert.equal(isBookingCancellable(f.rows, new Date(start.getTime() - 4 * 60 * 60_000)), false);
  assert.equal(isBookingCancellable(f.rows, new Date(start.getTime() - 4 * 60 * 60_000 - 1)), true);
  const response = await f.cancel(credentials);
  assert.equal(response.status, 200);
  assert.equal((await response.json()).bookingReference, reference);
  assert.deepEqual(f.rows.map((item) => item.status), ["cancelled", "cancelled"]);
  assert.equal(f.writes(), 2);
  assert.equal((await f.cancel(credentials)).status, 200);
  assert.equal(f.writes(), 2);
});
