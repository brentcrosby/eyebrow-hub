import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { NextResponse } from "next/server.js";
import { loadModule } from "./helpers/loadModule.mjs";

const env = {
  NEXT_PUBLIC_SUPABASE_URL: "https://fixture.supabase.invalid",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "fixture-anon-key",
};

const { middleware } = loadModule("middleware.ts", {
  mocks: { "next/server": { NextResponse } },
});

function apiRequest(method, origin) {
  return {
    method,
    headers: new Headers({ host: "localhost:3000", ...(origin && { origin }) }),
    nextUrl: { pathname: "/api/admin/account" },
    url: "http://localhost:3000/api/admin/account",
    cookies: { get: () => undefined },
  };
}

test("every admin API response is marked private and not cached", () => {
  const allowed = middleware(apiRequest("GET"));
  const blocked = middleware(apiRequest("POST", "https://evil.example"));

  assert.equal(allowed.headers.get("cache-control"), "private, no-store");
  assert.equal(blocked.status, 403);
  assert.equal(blocked.headers.get("cache-control"), "private, no-store");
});

function loadAccount(fetch) {
  return loadModule("app/api/admin/account/route.ts", {
    mocks: {
      "next/server": { NextResponse },
      "@/lib/adminAuth": {
        requireAdmin: async () => ({ authenticated: true, user: { email: "fixture@example.invalid" } }),
      },
      "@/lib/supabase": { createSupabaseClient: () => ({}) },
    },
    env,
    globals: { fetch },
  });
}

const changeEmail = {
  json: async () => ({ email: "new@example.invalid" }),
  cookies: { get: () => ({ value: "a.b.c" }) },
};

test("a Supabase error is replaced with a safe message", async () => {
  const route = loadAccount(async () =>
    Response.json({ msg: "internal detail from Supabase" }, { status: 422 })
  );

  const response = await route.PATCH(changeEmail);
  const body = await response.json();

  assert.equal(response.status, 400);
  assert.equal(body.message, "Could not update the account. Please try again.");
});

test("if Supabase can't be reached, account changes fail safely instead of crashing", async () => {
  const route = loadAccount(async () => {
    throw new Error("network down");
  });

  const response = await route.PATCH(changeEmail);

  assert.equal(response.status, 400);
  assert.equal((await response.json()).message, "Could not update the account. Please try again.");
});

function loadLogout(fetch) {
  return loadModule("app/api/admin/logout/route.ts", {
    mocks: { "next/server": { NextResponse } },
    env,
    globals: { fetch, AbortSignal },
  });
}

const withToken = { cookies: { get: () => ({ value: "a.b.c" }) } };

test("logout says honestly when the server session could not be ended", async () => {
  const route = loadLogout(async () => {
    throw new Error("timed out");
  });

  const response = await route.POST(withToken);

  assert.equal(response.status, 200);
  assert.match((await response.json()).message, /server session will expire on its own/);
  assert.match(response.headers.get("set-cookie"), /^adminAccessToken=;/);
});

test("logout gives up on Supabase after a time limit", async () => {
  let signal;
  const route = loadLogout(async (url, init) => {
    signal = init.signal;
    return new Response(null, { status: 204 });
  });

  const response = await route.POST(withToken);

  assert.ok(signal instanceof AbortSignal);
  assert.equal((await response.json()).message, "Logged out");
});

test("the auth routes never log tokens, passwords or request details", () => {
  for (const file of [
    "app/api/admin/login/route.ts",
    "app/api/admin/logout/route.ts",
    "app/api/admin/account/route.ts",
    "lib/adminAuth.ts",
    "lib/adminSession.ts",
  ]) {
    const source = readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
    assert.doesNotMatch(source, /console\.(log|info|warn|error|debug)/, file);
  }
});
