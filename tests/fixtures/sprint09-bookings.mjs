// Synthetic, immutable fixtures shared by scheduling and recovery tests.
export const PACIFIC_BOOKING_CASES = Object.freeze([
  { date: "2026-10-31", time: "11:00 AM", utc: "2026-10-31T18:00:00.000Z" },
  { date: "2026-11-01", time: "12:30 AM", utc: "2026-11-01T07:30:00.000Z" },
  { date: "2026-11-01", time: "2:30 AM", utc: "2026-11-01T10:30:00.000Z" },
  { date: "2026-12-01", time: "11:00 AM", utc: "2026-12-01T19:00:00.000Z" },
].map(Object.freeze));

export const CANONICAL_STATUS_CASES = Object.freeze([
  { status: "pending", blocks: true },
  { status: "confirmed", blocks: true },
  { status: "completed", blocks: true },
  { status: "cancelled", blocks: false },
  { status: "rejected", blocks: false },
].map(Object.freeze));

export function bookingPayload(overrides = {}) {
  return {
    serviceIds: [1], stylistId: null,
    date: "2026-12-01", time: "11:00 AM",
    name: "Fixture Customer", email: "booking@example.invalid", phone: "5550100100",
    ...overrides,
  };
}

export function bookingRequest(body) {
  return { nextUrl: { origin: "http://localhost" }, json: async () => body };
}