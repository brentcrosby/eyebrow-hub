import assert from "node:assert/strict";
import { test } from "node:test";
import {
  formatPacificDateTime,
  getCancellationAvailability,
} from "../lib/manageBooking.ts";

const now = new Date("2026-09-27T12:00:00Z");
const service = (startTime, status = "pending") => ({
  name: "Brow threading",
  stylistName: null,
  startTime,
  endTime: "2026-09-28T20:30:00Z",
  status,
});
const booking = (...services) => ({
  bookingReference: "0123456789ABCDEF",
  startTime: services[0]?.startTime ?? "2026-09-28T20:00:00Z",
  endTime: "2026-09-28T20:30:00Z",
  services,
});

test("renders Pacific wall time regardless of machine timezone", () => {
  assert.match(formatPacificDateTime("2026-09-28T20:00:00Z"), /1:00 PM PDT/);
  assert.match(formatPacificDateTime("2026-12-28T20:00:00Z"), /12:00 PM PST/);
});

test("availability matches the server's strict earliest-service cutoff", () => {
  assert.equal(
    getCancellationAvailability(
      booking(
        service("2026-09-27T16:00:00.001Z"),
        service("2026-09-27T17:00:00Z", "confirmed")
      ),
      now
    ),
    "available"
  );
  assert.equal(
    getCancellationAvailability(
      booking(service("2026-09-27T16:00:00Z"), service("2026-09-27T17:00:00Z")),
      now
    ),
    "cutoff"
  );
  assert.equal(
    getCancellationAvailability(
      booking(
        service("2026-09-28T20:00:00Z"),
        service("2026-09-28T21:00:00Z", "completed")
      ),
      now
    ),
    "status"
  );
  assert.equal(
    getCancellationAvailability(
      booking(
        service("2026-09-28T20:00:00Z", "cancelled"),
        service("2026-09-28T21:00:00Z", "canceled")
      ),
      now
    ),
    "already-cancelled"
  );
  assert.equal(getCancellationAvailability(booking(), now), "status");
});
