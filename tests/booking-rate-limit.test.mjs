import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { NextResponse } from "next/server.js";
import { bookingRetryMessage } from "../lib/bookingRetry.ts";

function load(path, mocks, globals = {}) {
  const exports = {};
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  vm.runInNewContext(
    ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText,
    {
      exports,
      console: globals.console ?? console,
      Date,
      process: globals.process ?? process,
      URL,
      require: (name) => {
        assert.ok(name in mocks, `Unexpected import: ${name}`);
        return mocks[name];
      },
    }
  );
  return exports;
}

const secret = "test-secret-at-least-thirty-two-characters";
const env = { VERCEL: "1", BOOKING_RATE_LIMIT_SECRET: secret };
const limiter = load("../lib/bookingRateLimit.ts", {
  "node:crypto": { createHmac },
  "node:net": { isIP },
  "next/server": { NextResponse },
  "@/lib/db": { db: {} },
});

function fixture() {
  let time = Date.parse("2026-10-01T12:00:00Z");
  const counters = new Map();
  const counter = async (operation, key, now, windowMs) => {
    const id = `${operation}:${key}`;
    const old = counters.get(id);
    const next =
      !old || old.expires_at <= now
        ? { request_count: 1, expires_at: new Date(now.getTime() + windowMs) }
        : { request_count: old.request_count + 1, expires_at: old.expires_at };
    counters.set(id, next);
    return next;
  };
  const headers = new Headers({ "x-vercel-forwarded-for": "203.0.113.10" });
  const check = (operation, h = headers) =>
    limiter.checkBookingLimit(operation, h, {
      env,
      counter,
      now: () => new Date(time),
    });
  return { check, headers, advance: (ms) => (time += ms), counters };
}

test("separate operation and caller budgets; expiry resets exactly at boundary", async () => {
  const f = fixture();
  for (const operation of ["create", "lookup", "cancel"]) {
    for (let i = 0; i < limiter.BOOKING_LIMITS[operation]; i++)
      assert.equal(await f.check(operation), null);
    assert.equal(await f.check(operation), 900);
  }
  const second = new Headers({ "x-vercel-forwarded-for": "203.0.113.11" });
  assert.equal(await f.check("create", second), null);
  assert.equal(f.counters.size, 4);
  for (const key of f.counters.keys()) {
    assert.doesNotMatch(key, /203\.0\.113/);
  }
  f.advance(899_001);
  assert.equal(await f.check("create"), 1);
  f.advance(999);
  assert.equal(await f.check("create"), null);
});

test("missing or spoofable identity and missing secret reject before store access", async () => {
  let calls = 0;
  const counter = async () => {
    calls++;
    return { request_count: 1, expires_at: new Date() };
  };
  for (const headers of [
    new Headers({ "x-forwarded-for": "203.0.113.1" }),
    new Headers({ "x-vercel-forwarded-for": "203.0.113.1, 198.51.100.1" }),
    new Headers({ "x-vercel-forwarded-for": "invalid" }),
  ]) {
    await assert.rejects(
      limiter.checkBookingLimit("lookup", headers, { env, counter })
    );
  }
  await assert.rejects(
    limiter.checkBookingLimit(
      "lookup",
      new Headers({ "x-vercel-forwarded-for": "203.0.113.1" }),
      { env: { VERCEL: "1" }, counter }
    )
  );
  assert.equal(calls, 0);
});

test("IPv6 variants share a bucket and non-Vercel ingress needs an explicit header", async () => {
  const f = fixture();
  const first = new Headers({
    "x-vercel-forwarded-for": "2001:0db8:0:0:0:0:0:1",
  });
  const second = new Headers({ "x-vercel-forwarded-for": "2001:db8::1" });
  for (let i = 0; i < limiter.BOOKING_LIMITS.create; i++) {
    assert.equal(await f.check("create", first), null);
  }
  assert.equal(await f.check("create", second), 900);
  assert.equal(f.counters.size, 1);
  const proxyEnv = {
    BOOKING_RATE_LIMIT_SECRET: secret,
    BOOKING_CLIENT_IP_HEADER: "x-trusted-client-ip",
  };
  assert.equal(
    limiter.trustedCallerIp(
      new Headers({ "x-trusted-client-ip": "198.51.100.3" }),
      proxyEnv
    ),
    "198.51.100.3"
  );
  assert.equal(
    limiter.trustedCallerIp(
      new Headers({ "x-forwarded-for": "198.51.100.3" }),
      proxyEnv
    ),
    null
  );
});

test("customer retry guidance uses safe seconds with a fallback", () => {
  assert.equal(
    bookingRetryMessage("1"),
    "Too many requests. Please try again in 1 minute."
  );
  assert.equal(
    bookingRetryMessage("900"),
    "Too many requests. Please try again in 15 minutes."
  );
  assert.equal(
    bookingRetryMessage("untrusted"),
    "Too many requests. Please try again later."
  );
});

test("missing configuration fails closed with no-store 503", async () => {
  const quietLimiter = load(
    "../lib/bookingRateLimit.ts",
    {
      "node:crypto": { createHmac },
      "node:net": { isIP },
      "next/server": { NextResponse },
      "@/lib/db": { db: {} },
    },
    { console: { error: () => {} }, process: { env: {} } }
  );
  const response = await quietLimiter.bookingLimitResponse(
    { headers: new Headers() },
    "create"
  );
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
});

test("database failure fails closed with no-store 503", async () => {
  let calls = 0;
  const storageLimiter = load(
    "../lib/bookingRateLimit.ts",
    {
      "node:crypto": { createHmac },
      "node:net": { isIP },
      "next/server": { NextResponse },
      "@/lib/db": {
        db: {
          $queryRaw: async () => {
            calls++;
            throw new Error("Database unavailable");
          },
        },
      },
    },
    { console: { error: () => {} }, process: { env } }
  );
  const response = await storageLimiter.bookingLimitResponse(
    {
      headers: new Headers({ "x-vercel-forwarded-for": "203.0.113.10" }),
    },
    "create"
  );
  assert.equal(calls, 1);
  assert.equal(response.status, 503);
  assert.equal(response.headers.get("Cache-Control"), "no-store");
});
