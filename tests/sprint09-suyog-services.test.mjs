import assert from "node:assert/strict";
import { test } from "node:test";
import { NextResponse } from "next/server.js";
import { Prisma } from "@prisma/client";
import { z } from "zod";
import { loadModule } from "./helpers/loadModule.mjs";
const schemas = loadModule("lib/validations/service.ts", {
  mocks: { zod: { z } },
});
const free = {
  name: "Brow Consult",
  price: "0",
  durationMinutes: 15,
  active: true,
};
test("free and paid prices accept storage limits without silent rounding", () => {
  for (const price of [0, "0", "0.00", "25.50", 25.5, "99999999.99"]) {
    assert.ok(
      schemas.createServiceSchema.safeParse({ ...free, price }).success
    );
    assert.ok(
      schemas.updateServiceSchema.safeParse({ ...free, id: 1, price }).success
    );
  }
  for (const price of [
    -1,
    "-1",
    NaN,
    Infinity,
    "Infinity",
    "",
    "abc",
    "1.001",
    1.001,
    "100000000",
    100000000,
    "1e2",
  ]) {
    assert.equal(
      schemas.createServiceSchema.safeParse({ ...free, price }).success,
      false,
      String(price)
    );
  }
});
test("names and whole-minute durations have useful bounds", () => {
  for (const durationMinutes of [5, 480])
    assert.ok(
      schemas.createServiceSchema.safeParse({ ...free, durationMinutes })
        .success
    );
  for (const durationMinutes of [0, 4, 481, 15.5, Infinity, "15"])
    assert.equal(
      schemas.createServiceSchema.safeParse({ ...free, durationMinutes })
        .success,
      false
    );
  for (const name of ["", "   ", "x".repeat(101)])
    assert.equal(
      schemas.createServiceSchema.safeParse({ ...free, name }).success,
      false
    );
  assert.equal(
    schemas.createServiceSchema.parse({ ...free, name: "  Brow Consult  " })
      .name,
    "Brow Consult"
  );
});
test("API creates, edits, deactivates and reactivates free and paid services without deleting history", async () => {
  for (const price of ["0", "25.50"]) {
    let stored;
    let writes = 0;
    const history = [{ id: 9, serviceId: 1 }];
    const db = {
      service: {
        create: async ({ data }) => {
          writes++;
          return (stored = {
            id: 1,
            ...data,
            price: new Prisma.Decimal(data.price),
          });
        },
        update: async ({ data }) => {
          writes++;
          return (stored = {
            ...stored,
            ...data,
            price: new Prisma.Decimal(data.price ?? stored.price),
          });
        },
        findUnique: async () => ({
          ...stored,
          _count: { appointments: history.length },
        }),
        delete: async () => assert.fail("Referenced service must stay intact"),
      },
      $transaction: async (fn) => fn(db),
    };
    const api = loadModule("app/api/admin/services/route.ts", {
      mocks: {
        "next/server": { NextResponse },
        "@prisma/client": { Prisma },
        "@/lib/db": { db },
        "@/lib/adminAuth": {
          requireAdmin: async () => ({ authenticated: true }),
        },
        "@/lib/validations/service": schemas,
      },
    });
    const request = (body) => ({ json: async () => body });
    assert.equal((await api.POST(request({ ...free, price }))).status, 201);
    assert.equal(
      (await api.PATCH(request({ ...free, price, id: 1 }))).status,
      200
    );
    assert.equal(
      (await api.DELETE({ nextUrl: new URL("https://fixture.test?id=1") }))
        .status,
      200
    );
    assert.equal(stored.active, false);
    assert.equal(
      (await api.PATCH(request({ ...free, price, id: 1 }))).status,
      200
    );
    assert.equal(stored.active, true);
    assert.equal(history[0].serviceId, stored.id);
    const before = writes;
    assert.equal(
      (await api.POST(request({ ...free, price: "1.001" }))).status,
      400
    );
    assert.equal(writes, before);
  }
});
