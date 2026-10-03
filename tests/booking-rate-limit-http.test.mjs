import assert from "node:assert/strict";
import { test } from "node:test";
import {
  clearBucket,
  expireBucket,
  localFixture,
} from "./dt524-local-helpers.mjs";

const enabled = Boolean(
  process.env.DT524_TEST_DATABASE_URL && process.env.DT524_HTTP_TEST === "1"
);

test(
  "real proxy and API give 429 then recover for all three operations",
  { skip: !enabled },
  async () => {
    const { db, callerKey, baseURL } = localFixture();
    const operations = [
      { name: "create", path: "/api/bookings", allowed: 5, status: 400 },
      {
        name: "lookup",
        path: "/api/bookings/lookup",
        allowed: 30,
        status: 404,
      },
      {
        name: "cancel",
        path: "/api/bookings/cancel",
        allowed: 10,
        status: 404,
      },
    ];
    const send = (path) =>
      fetch(`${baseURL}${path}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-trusted-client-ip": "192.0.2.99",
        },
        body: "{}",
      });
    try {
      for (const operation of operations) {
        await clearBucket(db, operation.name, callerKey);
        for (let i = 0; i < operation.allowed; i++) {
          assert.equal(
            (await send(operation.path)).status,
            operation.status,
            `${operation.name} normal request ${i + 1}`
          );
        }
        const blocked = await send(operation.path);
        assert.equal(blocked.status, 429, operation.name);
        assert.deepEqual(await blocked.json(), {
          success: false,
          error: "Too many requests. Please try again later.",
        });
        const retry = Number(blocked.headers.get("retry-after"));
        assert.ok(
          retry > 0 && retry <= 900,
          `${operation.name} retry-after: ${retry}`
        );
        assert.equal(blocked.headers.get("cache-control"), "no-store");
        await expireBucket(db, operation.name, callerKey);
        assert.equal(
          (await send(operation.path)).status,
          operation.status,
          `${operation.name} recovered`
        );
      }
    } finally {
      for (const operation of operations)
        await clearBucket(db, operation.name, callerKey);
      await db.$disconnect();
    }
  }
);
