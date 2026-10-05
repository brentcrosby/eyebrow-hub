import assert from "node:assert/strict";
import { test } from "node:test";
import { NextResponse } from "next/server.js";
import { loadModule } from "./helpers/loadModule.mjs";

// signIn is what the fake Supabase returns for signInWithPassword.
function loadLogin(signIn, env = {}) {
  return loadModule("app/api/admin/login/route.ts", {
    mocks: {
      "next/server": { NextResponse },
      "@/lib/supabase": {
        createSupabaseClient: () => ({ auth: { signInWithPassword: signIn } }),
      },
    },
    env,
  });
}

function loginRequest(body) {
  return { json: async () => body };
}

const credentials = { email: "fixture@example.invalid", password: "fixture-pass" };
const session = { access_token: "a.b.c", expires_in: 3600 };

test("login sets an HttpOnly cookie and returns no token", async () => {
  const route = loadLogin(async () => ({ data: { session }, error: null }), {
    NODE_ENV: "production",
  });

  const response = await route.POST(loginRequest(credentials));
  const cookie = response.headers.get("set-cookie");
  const body = await response.text();

  assert.equal(response.status, 200);
  assert.ok(cookie.startsWith("adminAccessToken=a.b.c;"));
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /Secure/);
  assert.match(cookie, /SameSite=lax/);
  assert.match(cookie, /Path=\//);
  assert.match(cookie, /Max-Age=3600/);
  assert.ok(!body.includes("a.b.c"));
});

test("the cookie is not marked Secure outside production, so localhost works", async () => {
  const route = loadLogin(async () => ({ data: { session }, error: null }), {
    NODE_ENV: "development",
  });

  const response = await route.POST(loginRequest(credentials));

  assert.doesNotMatch(response.headers.get("set-cookie"), /Secure/);
});

test("wrong credentials get a generic 401 and no cookie", async () => {
  const route = loadLogin(async () => ({
    data: { session: null },
    error: { message: "Invalid login credentials" },
  }));

  const response = await route.POST(loginRequest(credentials));

  assert.equal(response.status, 401);
  assert.equal((await response.json()).message, "Invalid email or password");
  assert.equal(response.headers.get("set-cookie"), null);
});

test("a server error returns a generic 500 without the error details", async () => {
  const route = loadLogin(async () => {
    throw new Error("internal detail");
  });

  const response = await route.POST(loginRequest(credentials));
  const body = await response.text();

  assert.equal(response.status, 500);
  assert.ok(!body.includes("internal detail"));
});

test("missing email or password returns 400", async () => {
  const route = loadLogin(async () => {
    throw new Error("should not be called");
  });

  const response = await route.POST(loginRequest({ email: "" }));

  assert.equal(response.status, 400);
});
