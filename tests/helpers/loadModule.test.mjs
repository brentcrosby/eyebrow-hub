import assert from "node:assert/strict";
import { test } from "node:test";
import { NextResponse } from "next/server.js";
import { loadModule } from "./loadModule.mjs";

function adminAuthMocks(userId) {
  return {
    "next/server": { NextResponse },
    "@/lib/supabase": {
      createSupabaseClient: () => ({
        auth: {
          getUser: async () => ({ data: { user: { id: userId } }, error: null }),
        },
      }),
    },
  };
}

const request = { cookies: { get: () => ({ value: "a.b.c" }) } };

test("returns the module's real exports", () => {
  const { getStatusLabel } = loadModule("lib/appointmentStatus.ts");

  assert.equal(getStatusLabel(" CANCELED "), "Cancelled");
});

test("refuses any import that has no mock", () => {
  assert.throws(
    () => loadModule("lib/adminAuth.ts"),
    /imports "next\/server" but no mock was given/
  );
});

test("the module sees only the env passed in, never the real one", async () => {
  const original = process.env.ADMIN_USER_IDS;
  process.env.ADMIN_USER_IDS = "leaked-id";

  try {
    const isolated = loadModule("lib/adminAuth.ts", {
      mocks: adminAuthMocks("leaked-id"),
    });
    assert.equal((await isolated.requireAdmin(request)).response.status, 403);

    const configured = loadModule("lib/adminAuth.ts", {
      mocks: adminAuthMocks("owner-id"),
      env: { ADMIN_USER_IDS: "owner-id" },
    });
    assert.equal((await configured.requireAdmin(request)).authenticated, true);
  } finally {
    if (original === undefined) delete process.env.ADMIN_USER_IDS;
    else process.env.ADMIN_USER_IDS = original;
  }
});
