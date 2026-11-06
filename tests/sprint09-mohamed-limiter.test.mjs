import assert from "node:assert/strict";
import { createHmac, randomUUID } from "node:crypto";
import { isIP } from "node:net";
import { test } from "node:test";
import { NextResponse } from "next/server.js";
import { loadModule } from "./helpers/loadModule.mjs";

function loadLimiter(db = {}) {
  return loadModule("lib/bookingRateLimit.ts", {
    mocks: {
      "node:crypto": { createHmac },
      "node:net": { isIP },
      "next/server": { NextResponse },
      "@/lib/db": { db },
    },
  });
}

test("cleanup deletes only expired rows, in bounded batches", async () => {
  let sql, values;
  const limiter = loadLimiter({
    $executeRaw: async (strings, ...args) => {
      sql = strings.join("?");
      values = args;
      return 3;
    },
  });
  const now = new Date("2026-11-05T12:00:00Z");

  assert.equal(await limiter.deleteExpiredLimits(now, 50), 3);
  assert.match(sql, /DELETE FROM "booking_request_limits"/);
  assert.match(sql, /"expires_at" <= \?/);
  assert.match(sql, /LIMIT \?/);
  assert.deepEqual(values, [now, 50]);
});

// Spoofing: the caller can't get a fresh login budget by changing headers they
// control. Only the header set by the trusted ingress identifies the caller.
function sharedCounter() {
  const rows = new Map();
  return async (operation, key, now, windowMs) => {
    const old = rows.get(`${operation}:${key}`);
    const next = old
      ? { request_count: old.request_count + 1, expires_at: old.expires_at }
      : { request_count: 1, expires_at: new Date(now.getTime() + windowMs) };
    rows.set(`${operation}:${key}`, next);
    return next;
  };
}

const secret = "test-secret-at-least-thirty-two-characters";

for (const [ingress, env, trustedHeader] of [
  ["Vercel", { VERCEL: "1", BOOKING_RATE_LIMIT_SECRET: secret }, "x-vercel-forwarded-for"],
  [
    "a self-hosted proxy",
    { BOOKING_CLIENT_IP_HEADER: "x-trusted-client-ip", BOOKING_RATE_LIMIT_SECRET: secret },
    "x-trusted-client-ip",
  ],
]) {
  test(`behind ${ingress}, spoofed X-Forwarded-For / X-Real-IP can't reset the login limit`, async () => {
    const limiter = loadLimiter();
    const counter = sharedCounter();
    const now = () => new Date("2026-11-05T12:00:00Z");
    let lastResult;

    for (let i = 1; i <= 11; i++) {
      const headers = new Headers({
        [trustedHeader]: "203.0.113.10",
        "x-forwarded-for": `198.51.100.${i}`,
        "x-real-ip": `192.0.2.${i}`,
      });
      lastResult = await limiter.checkBookingLimit("login", headers, { env, counter, now });
    }

    assert.equal(lastResult, 900);
  });
}

test("with only client-controlled headers, the limiter refuses to guess the caller", async () => {
  const limiter = loadLimiter();
  const headers = new Headers({ "x-forwarded-for": "198.51.100.1" });

  await assert.rejects(
    limiter.checkBookingLimit("login", headers, {
      env: { VERCEL: "1", BOOKING_RATE_LIMIT_SECRET: secret },
      counter: sharedCounter(),
    }),
    /not configured/
  );
});

test(
  "real PostgreSQL: cleanup removes expired rows in batches and keeps active ones",
  { skip: !process.env.DT524_TEST_DATABASE_URL },
  async () => {
    const { PrismaClient } = await import("@prisma/client");
    const { PrismaPg } = await import("@prisma/adapter-pg");
    const { isolatedDatabaseUrl } = await import("../scripts/dt524-test-db.mjs");
    const db = new PrismaClient({
      adapter: new PrismaPg({ connectionString: isolatedDatabaseUrl() }),
    });
    const limiter = loadLimiter(db);
    const key = `dt588-${randomUUID()}`;
    // Dates far in the past, so other tests' rows are never touched.
    const now = new Date("2000-06-01T00:00:00Z");
    const rows = [
      ["login", new Date("2000-01-01T00:00:00Z")],
      ["create", new Date("2000-01-01T00:00:00Z")],
      ["lookup", new Date("2000-12-01T00:00:00Z")], // still active at `now`
    ];

    try {
      for (const [operation, expiresAt] of rows) {
        await db.$executeRaw`
          INSERT INTO "booking_request_limits" ("operation", "caller_key", "request_count", "expires_at")
          VALUES (${operation}, ${key}, 1, ${expiresAt})`;
      }

      assert.equal(await limiter.deleteExpiredLimits(now, 1), 1);
      assert.equal(await limiter.deleteExpiredLimits(now, 1), 1);
      assert.equal(await limiter.deleteExpiredLimits(now, 1), 0);

      const left = await db.$queryRaw`
        SELECT "operation" FROM "booking_request_limits" WHERE "caller_key" = ${key}`;
      assert.deepEqual(left.map((row) => row.operation), ["lookup"]);
    } finally {
      await db.$executeRaw`DELETE FROM "booking_request_limits" WHERE "caller_key" = ${key}`;
      await db.$disconnect();
    }
  }
);
