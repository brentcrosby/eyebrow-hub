import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { NextResponse } from "next/server.js";

const routeFile = new URL(
  "../app/api/admin/dashboard-summary/route.ts",
  import.meta.url
);
const source = readFileSync(routeFile, "utf8");

function fixture({ authenticated = false, fail = false } = {}) {
  const calls = [];
  const privateName = "Synthetic Customer";
  const date = new Date("2026-09-30T15:00:00.000Z");
  const appointment = {
    id: 1,
    startTime: date,
    endTime: new Date(date.getTime() + 3600000),
    status: "PENDING",
    customerName: privateName,
    customerPhone: "5550000000",
    customerEmail: "synthetic@example.invalid",
    service: { name: "Synthetic Service" },
  };
  function query(name, value) {
    return async (args) => {
      calls.push({ name, args });
      if (fail) throw new Error(`Database failed for ${privateName}`);
      return value;
    };
  }
  const db = {
    appointment: {
      findMany: async (args) => {
        const index = calls.filter(
          (call) => call.name === "appointment"
        ).length;
        return query(
          "appointment",
          [[appointment], [{ status: "PENDING" }], [appointment]][index]
        )(args);
      },
    },
    availabilityBlock: { findMany: query("block", []) },
  };
  const auth = { authenticated: authenticated };
  const denied = new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
  if (!authenticated) auth.response = denied;
  const mocks = {
    "next/server": { NextResponse },
    "@/lib/adminAuth": {
      requireAdmin: async () => {
        calls.push({ name: "auth" });
        return auth;
      },
    },
    "@/lib/db": { db },
    "@/lib/appointmentStatus": {
      PENDING_STATUS: "PENDING",
      isCancelled: (status) => status === "CANCELLED",
    },
  };
  const output = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  }).outputText;
  const exports = {};
  vm.runInNewContext(output, {
    exports,
    require: (moduleName) => {
      assert.ok(moduleName in mocks, `Unexpected import: ${moduleName}`);
      return mocks[moduleName];
    },
    Date,
    URL,
    console: { error() {} },
  });
  const request = (query = "") => ({
    url: `https://example.invalid/api/admin/dashboard-summary${query}`,
  });
  return { GET: exports.GET, calls, request, privateName };
}

const validQuery =
  "?dayStart=2026-09-30T00%3A00%3A00Z&dayEnd=2026-10-01T00%3A00%3A00Z" +
  "&weekStart=2026-09-28T00%3A00%3A00Z&weekEnd=2026-10-05T00%3A00%3A00Z";

test("anonymous requests are denied before validation and database access", async () => {
  for (const query of ["", validQuery]) {
    const { GET, calls, request, privateName } = fixture();
    const response = await GET(request(query));
    assert.equal(response.status, 401);
    assert.equal(response.headers.get("Cache-Control"), "private, no-store");
    const body = await response.text();
    for (const sensitive of [
      privateName,
      "5550000000",
      "synthetic@example.invalid",
      "pendingCount",
    ]) {
      assert.ok(!body.includes(sensitive));
    }
    assert.deepEqual(
      calls.map((call) => call.name),
      ["auth"]
    );
  }
});

test("authenticated session receives only the required fields and a non-cacheable response", async () => {
  const { GET, calls, request } = fixture({ authenticated: true });
  const response = await GET(request(validQuery));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  const body = await response.json();
  assert.equal(body.pendingCount, 1);
  assert.equal(body.todayCount, 1);
  assert.equal(body.weekCount, 1);
  assert.equal(body.pendingRequests[0].phone, "5550000000");
  assert.equal(body.todaysItems[0].subtitle, "Synthetic Customer");
  assert.equal(calls.length, 5);
  for (const call of calls.slice(1)) {
    assert.ok(call.args.select, `${call.name} must use a select`);
    assert.ok(
      !call.args.include,
      `${call.name} must not include entire relations`
    );
  }
});

test("validation and database errors remain private and do not disclose fixture data", async () => {
  const invalid = fixture({ authenticated: true });
  const badResponse = await invalid.GET(invalid.request());
  assert.equal(badResponse.status, 400);
  assert.equal(badResponse.headers.get("Cache-Control"), "private, no-store");
  assert.deepEqual(
    invalid.calls.map((call) => call.name),
    ["auth"]
  );

  const failed = fixture({ authenticated: true, fail: true });
  const response = await failed.GET(failed.request(validQuery));
  assert.equal(response.status, 500);
  assert.equal(response.headers.get("Cache-Control"), "private, no-store");
  assert.ok(!(await response.text()).includes(failed.privateName));
});
