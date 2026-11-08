import assert from "node:assert/strict";
import { createServer } from "node:http";
import { test } from "node:test";
import { NextRequest, NextResponse } from "next/server.js";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { loadModule } from "./helpers/loadModule.mjs";
import * as salon from "../lib/salonTime.ts";

const schemas = loadModule("lib/validations/booking.ts", { mocks: { zod: { z } } });
const payload = {
  serviceIds: [1], stylistId: null, date: "2026-12-15", time: "10:00 AM",
  name: "Fixture", email: "fixture@example.invalid", phone: "2025550199",
};
const accessCookie = "fixture_host_access=allowed";

for (const route of ["app/api/bookings/route.ts", "app/api/bookings/validate/route.ts"]) {
  for (const scenario of ["authorized", "no-cookie", "redirect"]) {
    test(`${route}: protected availability ${scenario}`, async (t) => {
      const requests = [];
      const server = createServer((req, res) => {
        requests.push({ url: req.url, cookie: req.headers.cookie });
        if (scenario === "redirect" || req.headers.cookie !== accessCookie) {
          res.writeHead(302, { Location: "/signin" });
          res.end("Sign in");
        } else {
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify([{ time: "10:00 AM", available: false }]));
        }
      });
      await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
      t.after(() => new Promise((resolve) => {
        server.closeAllConnections();
        server.close(resolve);
      }));
      const origin = `http://127.0.0.1:${server.address().port}`;
      let writes = 0;
      const db = {
        service: { findMany: async () => [{ id: 1, name: "Fixture", price: 20, durationMinutes: 30 }] },
        $transaction: async () => { writes++; throw new Error("Unexpected appointment write"); },
      };
      const { POST } = loadModule(route, {
        mocks: {
          "next/server": { NextResponse }, "@prisma/client": { Prisma },
          "@/lib/db": { db }, "@/lib/salonTime": salon,
          "@/lib/validations/booking": schemas,
          "@/lib/bookingRateLimit": { bookingLimitResponse: async () => null },
          "@/lib/bookingReference": { createUniqueBookingReference: async () => { throw new Error("Unexpected reference"); } },
          "@/lib/bookingReservation": {
            assertReservationAvailable: async () => { throw new Error("Unexpected reservation"); },
            isReservationConflict: () => false,
          },
          "@/lib/bookingClosures": {},
        },
        globals: { fetch },
      });
      const headers = { "Content-Type": "application/json" };
      if (scenario !== "no-cookie") headers.cookie = accessCookie;
      const result = await POST(new NextRequest(`${origin}/api/bookings`, {
        method: "POST", headers, body: JSON.stringify(payload),
      }));
      assert.equal(result.status, scenario === "authorized" ? 409 : 503);
      const body = await result.json();
      if (scenario === "authorized") {
        assert.equal(body.errors.time, "Selected time is no longer available");
      } else {
        assert.equal(body.error, "Could not verify appointment availability");
      }
      assert.equal(writes, 0);
      assert.equal(requests.length, 1, "must not follow a redirect carrying the access cookie");
      const url = new URL(requests[0].url, origin);
      assert.equal(url.pathname, "/api/availability/times");
      assert.equal(url.searchParams.get("date"), payload.date);
      assert.equal(url.searchParams.get("duration"), "30");
      assert.equal(requests[0].cookie, scenario === "no-cookie" ? undefined : accessCookie);
    });
  }
}
