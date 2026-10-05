import assert from "node:assert/strict";
import { test } from "node:test";
import { NextResponse } from "next/server.js";
import { loadModule } from "./helpers/loadModule.mjs";

const { middleware } = loadModule("middleware.ts", {
  mocks: { "next/server": { NextResponse } },
});

function apiRequest(method, path, origin) {
  const headers = new Headers({ host: "localhost:3000" });
  if (origin) headers.set("origin", origin);
  return {
    method,
    headers,
    nextUrl: { pathname: path },
    url: `http://localhost:3000${path}`,
    cookies: { get: () => ({ value: "a.b.c" }) },
  };
}

// NextResponse.next() marks a request that is allowed through to the route.
const passedThrough = (response) => response.headers.get("x-middleware-next") === "1";

test("a change sent from another website is rejected before the route runs", async () => {
  for (const [method, path] of [
    ["POST", "/api/admin/services"],
    ["PATCH", "/api/admin/appointments/1/status"],
    ["DELETE", "/api/admin/availability-blocks"],
    ["POST", "/api/admin/login"],
    ["POST", "/api/admin/logout"],
  ]) {
    const response = middleware(apiRequest(method, path, "https://evil.example"));

    assert.equal(response.status, 403, `${method} ${path}`);
    assert.ok(!passedThrough(response));
  }
});

test("a change with no Origin header is rejected", () => {
  const response = middleware(apiRequest("PUT", "/api/admin/availability-settings"));

  assert.equal(response.status, 403);
});

test("same-site create, update and status changes are allowed through", () => {
  for (const [method, path] of [
    ["POST", "/api/admin/appointments"],
    ["PATCH", "/api/admin/services"],
    ["PATCH", "/api/admin/appointments/1/status"],
  ]) {
    const response = middleware(apiRequest(method, path, "http://localhost:3000"));

    assert.ok(passedThrough(response), `${method} ${path}`);
  }
});

test("GET requests are not blocked, since they only read data", () => {
  const response = middleware(
    apiRequest("GET", "/api/admin/dashboard/stats", "https://evil.example")
  );

  assert.ok(passedThrough(response));
});
