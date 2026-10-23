import assert from "node:assert/strict";
import { test } from "node:test";
import { NextResponse } from "next/server.js";
import { loadModule } from "./helpers/loadModule.mjs";

// Only "owner-id" is on the approved-admin list.
const env = { ADMIN_USER_IDS: "owner-id" };

function loadLogin(userId) {
  const supabase = {
    createSupabaseClient: () => ({
      auth: {
        signInWithPassword: async () => ({
          data: { user: { id: userId }, session: { access_token: "a.b.c", expires_in: 3600 } },
          error: null,
        }),
      },
    }),
  };
  const adminAuth = loadModule("lib/adminAuth.ts", {
    mocks: { "next/server": { NextResponse }, "@/lib/supabase": supabase },
    env,
  });
  return loadModule("app/api/admin/login/route.ts", {
    mocks: {
      "next/server": { NextResponse },
      "@/lib/supabase": supabase,
      "@/lib/adminAuth": adminAuth,
      "@/lib/bookingRateLimit": { checkBookingLimit: async () => null },
    },
    env,
  });
}

const credentials = { json: async () => ({ email: "fixture@example.invalid", password: "pw" }) };

test("an unapproved account gets 403 and no session cookie", async () => {
  const response = await loadLogin("someone-else").POST(credentials);
  const body = await response.json();

  assert.equal(response.status, 403);
  assert.equal(body.message, "This account does not have admin access.");
  assert.equal(response.headers.get("set-cookie"), null);
  assert.ok(!JSON.stringify(body).includes("owner-id"));
});

test("an approved account still gets its session cookie", async () => {
  const response = await loadLogin("owner-id").POST(credentials);

  assert.equal(response.status, 200);
  assert.match(response.headers.get("set-cookie"), /^adminAccessToken=a\.b\.c;.*HttpOnly/);
});

test("an expired session logs out once and redirects once, even with several 401s", async () => {
  const logoutCalls = [];
  const redirects = [];
  const window = {
    fetch: async (url) => {
      if (url === "/api/admin/logout") logoutCalls.push(url);
      return { status: 401 };
    },
    location: { replace: (url) => redirects.push(url) },
  };

  const session = loadModule("lib/adminSession.ts", {
    globals: {
      window,
      fetch: (...args) => window.fetch(...args),
      Request,
      localStorage: { removeItem: () => {} },
      document: { cookie: "" },
    },
  });
  session.watchAdminApi();

  await Promise.all([
    window.fetch("/api/admin/dashboard/stats"),
    window.fetch("/api/admin/account"),
    window.fetch("/api/admin/services"),
  ]);

  assert.equal(logoutCalls.length, 1);
  assert.deepEqual(redirects, ["/admin/login?expired=1"]);
});
