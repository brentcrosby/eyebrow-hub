import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { NextResponse } from "next/server.js";
import { Prisma } from "@prisma/client";
import { z } from "zod";

function load(path, mocks, env = {}) {
  const exports = {};
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  vm.runInNewContext(
    ts.transpileModule(source, {
      compilerOptions: { module: ts.ModuleKind.CommonJS },
    }).outputText,
    {
      exports,
      process: { env },
      URL,
      console,
      require: (name) => {
        assert.ok(name in mocks, `Unexpected import: ${name}`);
        return mocks[name];
      },
    }
  );
  return exports;
}

function fixture(identity = "approved-id") {
  const calls = [];
  let service = {
    id: 1,
    name: "Fixture service",
    price: new Prisma.Decimal(20),
    durationMinutes: 30,
    active: true,
  };
  const history = [{ id: 10, serviceId: 1 }];
  const db = {
    service: {
      findMany: async () => {
        calls.push("read");
        return [service];
      },
      create: async ({ data }) => {
        calls.push("create");
        service = { ...service, ...data };
        return service;
      },
      update: async ({ data }) => {
        calls.push("update");
        service = { ...service, ...data };
        return service;
      },
      findUnique: async () => {
        calls.push("lookup");
        return { ...service, _count: { appointments: history.length } };
      },
      delete: async () => {
        assert.fail("Referenced service must not be deleted");
      },
    },
    stylist: {
      findFirst: async () => {
        calls.push("stylist");
        return { id: 1, name: "Fixture stylist", active: true };
      },
    },
    $transaction: async (callback) => {
      calls.push("transaction");
      return callback(db);
    },
  };
  const auth = load(
    "../lib/adminAuth.ts",
    {
      "next/server": { NextResponse },
      "@/lib/supabase": {
        createSupabaseClient: () => ({
          auth: {
            getUser: async () => ({
              data: { user: { id: identity } },
              error: null,
            }),
          },
        }),
      },
    },
    { ADMIN_USER_IDS: "approved-id" }
  );
  const mocks = {
    "next/server": { NextResponse },
    "@prisma/client": { Prisma },
    "@/lib/db": { db },
    "@/lib/adminAuth": auth,
    "@/lib/validations/service": load("../lib/validations/service.ts", {
      zod: { z },
    }),
  };
  const url = "https://example.invalid/api/admin/services?id=1";
  const request = (body = {}) => ({
    url,
    nextUrl: new URL(url),
    cookies: { get: () => (identity ? { value: "a.b.c" } : undefined) },
    json: async () => body,
  });
  return {
    services: load("../app/api/admin/services/route.ts", mocks),
    employee: load("../app/api/admin/employee-services/route.ts", mocks),
    calls,
    history,
    request,
  };
}

test("anonymous and unapproved users cannot read or write service data", async () => {
  for (const identity of [null, "unapproved-id"]) {
    const f = fixture(identity);
    for (const handler of [
      f.services.GET,
      f.services.POST,
      f.services.PATCH,
      f.services.DELETE,
      f.employee.GET,
    ]) {
      const response = await handler(f.request());
      assert.equal(response.status, identity ? 403 : 401);
      assert.deepEqual(await response.json(), {
        error: identity ? "Forbidden" : "Unauthorized",
      });
    }
    assert.deepEqual(f.calls, []);
  }
});

test("approved admins can read, add, edit and deactivate without touching appointment history", async () => {
  const f = fixture();
  const originalHistory = structuredClone(f.history);
  assert.equal((await f.services.GET(f.request())).status, 200);
  assert.equal((await f.employee.GET(f.request())).status, 200);
  const body = { name: "New fixture", price: "25", durationMinutes: 45 };
  const created = await f.services.POST(f.request(body));
  assert.equal(created.status, 201);
  assert.equal((await created.json()).name, body.name);
  const updated = await f.services.PATCH(
    f.request({ ...body, id: 1, name: "Edited fixture" })
  );
  assert.equal(updated.status, 200);
  assert.equal((await updated.json()).name, "Edited fixture");
  const deactivated = await f.services.DELETE(f.request());
  assert.equal(deactivated.status, 200);
  const result = await deactivated.json();
  assert.equal(result.action, "deactivated");
  assert.equal(result.service.active, false);
  assert.deepEqual(f.calls, [
    "read",
    "stylist",
    "read",
    "create",
    "update",
    "transaction",
    "lookup",
    "update",
  ]);
  assert.deepEqual(f.history, originalHistory);
});

test("employee-services DELETE remains retired", () => {
  assert.equal(fixture().employee.DELETE, undefined);
});
