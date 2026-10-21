import assert from "node:assert/strict";
import { test } from "node:test";
import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { NextResponse } from "next/server.js";
import { loadModule } from "./helpers/loadModule.mjs";

const env = { VERCEL: "1", BOOKING_RATE_LIMIT_SECRET: "test-secret-at-least-thirty-two-characters" };

const limiterMocks = {
  "node:crypto": { createHmac },
  "node:net": { isIP },
  "next/server": { NextResponse },
  "@/lib/db": { db: {} },
};

// An in-memory stand-in for the PostgreSQL counter table, shared by every
// "app instance" that uses it, the same way the real table is.
function sharedCounter() {
  const rows = new Map();
  const counter = async (operation, key, now, windowMs) => {
    const old = rows.get(`${operation}:${key}`);
    const next =
      !old || old.expires_at <= now
        ? { request_count: 1, expires_at: new Date(now.getTime() + windowMs) }
        : { request_count: old.request_count + 1, expires_at: old.expires_at };
    rows.set(`${operation}:${key}`, next);
    return next;
  };
  return { counter, rows };
}

test("the 11th login attempt is limited, across two app instances, and recovers after 15 minutes", async () => {
  const { counter, rows } = sharedCounter();
  const instanceA = loadModule("lib/bookingRateLimit.ts", { mocks: limiterMocks });
  const instanceB = loadModule("lib/bookingRateLimit.ts", { mocks: limiterMocks });
  const headers = new Headers({ "x-vercel-forwarded-for": "203.0.113.10" });
  let time = Date.parse("2026-10-21T12:00:00Z");
  const check = (instance) =>
    instance.checkBookingLimit("login", headers, { env, counter, now: () => new Date(time) });

  for (let i = 0; i < 10; i++) {
    assert.equal(await check(i % 2 ? instanceA : instanceB), null);
  }
  assert.equal(await check(instanceA), 900);

  time += 15 * 60_000;
  assert.equal(await check(instanceB), null);

  // Only a hash of the IP is stored.
  for (const key of rows.keys()) assert.doesNotMatch(key, /203\.0\.113/);
});

function loadLogin(retryAfter, signIn) {
  return loadModule("app/api/admin/login/route.ts", {
    mocks: {
      "next/server": { NextResponse },
      "@/lib/supabase": { createSupabaseClient: () => ({ auth: { signInWithPassword: signIn } }) },
      "@/lib/bookingRateLimit": { checkBookingLimit: retryAfter },
      "@/lib/adminAuth": { isApprovedAdmin: () => true },
    },
  });
}

const request = (body) => ({ headers: new Headers(), json: async () => body });
const credentials = { email: "fixture@example.invalid", password: "pw" };
const neverCalled = async () => assert.fail("Supabase should not be called");

test("a limited caller gets 429 with Retry-After, before Supabase is called", async () => {
  const response = await loadLogin(async () => 120, neverCalled).POST(request(credentials));

  assert.equal(response.status, 429);
  assert.equal(response.headers.get("retry-after"), "120");
  assert.equal((await response.json()).message, "Too many login attempts. Please try again later.");
});

test("if the limiter is unavailable, login fails closed with 503", async () => {
  const route = loadLogin(async () => {
    throw new Error("not configured");
  }, neverCalled);

  const response = await route.POST(request(credentials));

  assert.equal(response.status, 503);
  assert.ok(!(await response.text()).includes("not configured"));
});

test("oversized fields are rejected without calling Supabase", async () => {
  const route = loadLogin(async () => null, neverCalled);

  const response = await route.POST(request({ email: "a".repeat(255), password: "pw" }));

  assert.equal(response.status, 400);
});

test("under the limit, a wrong password still gets the generic 401", async () => {
  const route = loadLogin(async () => null, async () => ({
    data: { session: null },
    error: { message: "Invalid login credentials" },
  }));

  const response = await route.POST(request(credentials));

  assert.equal(response.status, 401);
  assert.equal((await response.json()).message, "Invalid email or password");
});
