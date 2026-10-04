import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { NextResponse } from "next/server.js";
import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { isolatedDatabaseUrl } from "../scripts/dt524-test-db.mjs";

const enabled = Boolean(process.env.DT524_TEST_DATABASE_URL);

test(
  "real PostgreSQL upsert is atomic, scoped and resets at expiry",
  { skip: !enabled },
  async () => {
    const url = isolatedDatabaseUrl();
    const db = new PrismaClient({
      adapter: new PrismaPg({ connectionString: url }),
    });
    const exports = {};
    const code = ts.transpileModule(
      readFileSync(
        new URL("../lib/bookingRateLimit.ts", import.meta.url),
        "utf8"
      ),
      { compilerOptions: { module: ts.ModuleKind.CommonJS } }
    ).outputText;
    vm.runInNewContext(code, {
      exports,
      Date,
      URL,
      process,
      console,
      require: (name) =>
        ({
          "node:crypto": { createHmac },
          "node:net": { isIP },
          "next/server": { NextResponse },
          "@/lib/db": { db },
        })[name] ?? assert.fail(`Unexpected import: ${name}`),
    });
    const key = `test-${randomUUID()}`;
    const now = new Date("2026-10-01T12:00:00Z");
    const windowMs = 900_000;
    try {
      const calls = await Promise.all(
        Array.from({ length: 40 }, () =>
          exports.postgresCounter("lookup", key, now, windowMs)
        )
      );
      assert.deepEqual(
        calls.map((row) => row.request_count).sort((a, b) => a - b),
        Array.from({ length: 40 }, (_, index) => index + 1)
      );
      assert.ok(
        calls.every(
          (row) => row.expires_at.getTime() === now.getTime() + windowMs
        )
      );
      assert.equal(
        (await exports.postgresCounter("cancel", key, now, windowMs))
          .request_count,
        1
      );
      assert.equal(
        (await exports.postgresCounter("lookup", `${key}-other`, now, windowMs))
          .request_count,
        1
      );
      assert.equal(
        (
          await exports.postgresCounter(
            "lookup",
            key,
            new Date(now.getTime() + windowMs - 1),
            windowMs
          )
        ).request_count,
        41
      );
      const reset = await exports.postgresCounter(
        "lookup",
        key,
        new Date(now.getTime() + windowMs),
        windowMs
      );
      assert.equal(reset.request_count, 1);
      assert.equal(reset.expires_at.getTime(), now.getTime() + 2 * windowMs);
    } finally {
      await db.$executeRaw`DELETE FROM "booking_request_limits" WHERE "caller_key" IN (${key}, ${`${key}-other`})`;
      await db.$disconnect();
    }
  }
);
