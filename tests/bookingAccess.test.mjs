import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isBookingAlreadyCancelled,
  isBookingCancellable,
  matchesBookingPhone,
} from "../lib/bookingAccess.ts";

const now = new Date("2026-09-27T12:00:00.000Z");
const row = (
  startTime,
  status = "pending",
  customerPhone = "(530) 555-1234"
) => ({
  startTime: new Date(startTime),
  endTime: new Date(new Date(startTime).getTime() + 15 * 60_000),
  status,
  customerPhone,
});

test("lookup matches the phone on every service, ignoring formatting", () => {
  const rows = [row("2026-09-28T12:00:00Z"), row("2026-09-28T12:15:00Z")];
  assert.equal(matchesBookingPhone(rows, "5305551234"), true);
  assert.equal(matchesBookingPhone(rows, "5305559999"), false);
  assert.equal(matchesBookingPhone([], "5305551234"), false);
  assert.equal(
    matchesBookingPhone(
      [rows[0], row("2026-09-28T12:15:00Z", "pending", "5305559999")],
      "5305551234"
    ),
    false
  );
});

test("cancellation requires every service eligible and earliest start strictly after four hours", () => {
  const late = row("2026-09-27T16:00:00.001Z", "confirmed");
  assert.equal(
    isBookingCancellable([late, row("2026-09-27T16:15:00Z")], now),
    true
  );
  assert.equal(isBookingCancellable([row("2026-09-27T16:00:00Z")], now), false);
  assert.equal(
    isBookingCancellable([row("2026-09-27T15:59:59.999Z")], now),
    false
  );
  assert.equal(
    isBookingCancellable([row("2026-09-27T16:00:00Z"), late], now),
    false
  );
  for (const status of ["completed", "cancelled", "unknown"]) {
    assert.equal(
      isBookingCancellable([late, row("2026-09-27T17:00:00Z", status)], now),
      false
    );
  }
  assert.equal(isBookingCancellable([], now), false);
});

test("already cancelled is a no-write case only if the entire group is cancelled", () => {
  assert.equal(
    isBookingAlreadyCancelled([
      row("2026-09-28T12:00:00Z", "cancelled"),
      row("2026-09-28T12:15:00Z", "canceled"),
    ]),
    true
  );
  assert.equal(
    isBookingAlreadyCancelled([
      row("2026-09-28T12:00:00Z", "cancelled"),
      row("2026-09-28T12:15:00Z"),
    ]),
    false
  );
  assert.equal(isBookingAlreadyCancelled([]), false);
});

test("cutoff compares UTC instants across the autumn daylight-saving transition", () => {
  const beforeFallback = new Date("2026-11-01T04:30:00Z");
  assert.equal(
    isBookingCancellable([row("2026-11-01T08:30:00Z")], beforeFallback),
    false
  );
  assert.equal(
    isBookingCancellable([row("2026-11-01T08:30:00.001Z")], beforeFallback),
    true
  );
});
