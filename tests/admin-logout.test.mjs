import assert from "node:assert/strict";
import { test } from "node:test";
import { NextResponse } from "next/server.js";
import { loadModule } from "./helpers/loadModule.mjs";

const env = {
  NEXT_PUBLIC_SUPABASE_URL: "https://fixture.supabase.invalid",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "fixture-anon-key",
};

function loadLogout(fetch) {
  return loadModule("app/api/admin/logout/route.ts", {
    mocks: { "next/server": { NextResponse } },
    env,
    globals: { fetch },
  });
}

function requestWithToken(token) {
  return { cookies: { get: () => (token ? { value: token } : undefined) } };
}

function cookieWasDeleted(response) {
  const header = response.headers.get("set-cookie") ?? "";
  return header.startsWith("adminAccessToken=;") && header.includes("1970");
}

test("logout ends the Supabase session and deletes the cookie", async () => {
  const calls = [];
  const route = loadLogout(async (url, init) => {
    calls.push({ url, init });
    return new Response(null, { status: 204 });
  });

  const response = await route.POST(requestWithToken("a.b.c"));

  assert.equal(response.status, 200);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, `${env.NEXT_PUBLIC_SUPABASE_URL}/auth/v1/logout?scope=local`);
  assert.equal(calls[0].init.headers.Authorization, "Bearer a.b.c");
  assert.ok(cookieWasDeleted(response));
});

test("the cookie is still deleted when Supabase can't be reached", async () => {
  const route = loadLogout(async () => {
    throw new Error("network down");
  });

  const response = await route.POST(requestWithToken("a.b.c"));

  assert.equal(response.status, 200);
  assert.ok(cookieWasDeleted(response));
});

test("with no cookie, Supabase is not called and logout still succeeds", async () => {
  let called = false;
  const route = loadLogout(async () => {
    called = true;
  });

  const response = await route.POST(requestWithToken(null));

  assert.equal(response.status, 200);
  assert.equal(called, false);
  assert.ok(cookieWasDeleted(response));
});
