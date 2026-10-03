import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { NextResponse } from "next/server.js";

function load(path, mocks, env = {}) {
  const exports = {};
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  vm.runInNewContext(code, {
    exports,
    process: { env },
    console,
    require: (name) => {
      assert.ok(name in mocks, `Unexpected import: ${name}`);
      return mocks[name];
    },
  });
  return exports;
}

function fixture({
  token = "a.b.c",
  policy = "owner-id",
  id = "owner-id",
  invalid = false,
} = {}) {
  let verifications = 0;
  const user = {
    id,
    email: "owner@example.invalid",
    user_metadata: { role: "admin" },
  };
  const auth = load(
    "../lib/adminAuth.ts",
    {
      "next/server": { NextResponse },
      "@/lib/supabase": {
        createSupabaseClient: () => ({
          auth: {
            getUser: async () => {
              verifications++;
              return {
                data: { user: invalid ? null : user },
                error: invalid ? new Error("Invalid session") : null,
              };
            },
          },
        }),
      },
    },
    policy === null ? {} : { ADMIN_USER_IDS: policy }
  );
  return {
    auth,
    user,
    request: { cookies: { get: () => (token ? { value: token } : undefined) } },
    verifications: () => verifications,
  };
}

test("missing, malformed and invalid sessions return 401", async () => {
  for (const options of [
    { token: null },
    { token: "bad" },
    { invalid: true },
  ]) {
    const f = fixture(options);
    const result = await f.auth.requireAdmin(f.request);
    assert.equal(result.authenticated, false);
    assert.equal(result.response.status, 401);
    assert.equal(f.verifications(), options.invalid ? 1 : 0);
  }
});

test("only explicitly approved IDs pass; missing policy and editable metadata grant nothing", async () => {
  const approved = fixture({ policy: " another-id, owner-id, " });
  const result = await approved.auth.requireAdmin(approved.request);
  assert.equal(result.authenticated, true);
  assert.equal(result.user, approved.user);
  for (const options of [
    { id: "other-id" },
    { policy: null },
    { policy: "" },
    { policy: " , " },
  ]) {
    const f = fixture(options);
    const denied = await f.auth.requireAdmin(f.request);
    assert.equal(denied.authenticated, false);
    assert.equal(denied.response.status, 403);
  }
});

test("guarded route denies unapproved users before database work and preserves approved access", async () => {
  for (const id of ["other-id", "owner-id"]) {
    const f = fixture({ id });
    let queries = 0;
    const route = load("../app/api/admin/availability-settings/route.ts", {
      "next/server": { NextResponse },
      "@/lib/adminAuth": f.auth,
      "@/lib/db": { db: {} },
      "@/lib/availabilitySettings": {
        getAvailabilitySettings: async () => {
          queries++;
          return { businessHours: [] };
        },
      },
      "@/lib/validations/availabilitySettings": {},
    });
    const response = await route.GET(f.request);
    assert.equal(response.status, id === "owner-id" ? 200 : 403);
    assert.equal(queries, id === "owner-id" ? 1 : 0);
  }
});
