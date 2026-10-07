import assert from "node:assert/strict";
import { test } from "node:test";
import { NextResponse } from "next/server.js";
import { loadModule } from "./helpers/loadModule.mjs";

function createFixture({
  auth = { authenticated: true },
  appointment = { id: 7, status: "confirmed", notes: null },
  updatedAppointment = { id: 7, status: "cancelled" },
} = {}) {
  let findCalls = 0;
  let updateCalls = 0;

  const route = loadModule(
    "app/api/admin/appointments/[id]/status/route.ts",
    {
      mocks: {
        "next/server": { NextResponse },
        "@/lib/adminAuth": {
          requireAdmin: async () =>
            auth.authenticated
              ? { authenticated: true, user: { id: "approved-admin" } }
              : {
                  authenticated: false,
                  response: NextResponse.json(
                    { error: auth.error },
                    { status: auth.status }
                  ),
                },
        },
        "@/lib/db": {
          db: {
            appointment: {
              findUnique: async () => {
                findCalls += 1;
                return findCalls === 1 ? appointment : updatedAppointment;
              },
              updateMany: async () => {
                updateCalls += 1;
                return { count: 1 };
              },
            },
          },
        },
      },
    }
  );

  return {
    route,
    calls: () => ({ findCalls, updateCalls }),
  };
}

function requestWithStatus(status = "cancelled") {
  return { json: async () => ({ status }) };
}

test("authorized admin closes a confirmed appointment successfully", async () => {
  const fixture = createFixture();

  const response = await fixture.route.PATCH(requestWithStatus(), {
    params: Promise.resolve({ id: "7" }),
  });

  assert.equal(response.status, 200);
  assert.deepEqual(await response.json(), {
    success: true,
    appointment: { id: 7, status: "cancelled" },
  });
  assert.equal(fixture.calls().updateCalls, 1);
});

test("unauthenticated request is rejected before database work", async () => {
  const fixture = createFixture({
    auth: { authenticated: false, status: 401, error: "Unauthorized" },
  });

  const response = await fixture.route.PATCH(requestWithStatus(), {
    params: Promise.resolve({ id: "7" }),
  });

  assert.equal(response.status, 401);
  assert.deepEqual(fixture.calls(), { findCalls: 0, updateCalls: 0 });
});

test("authenticated user without admin permission is rejected before database work", async () => {
  const fixture = createFixture({
    auth: { authenticated: false, status: 403, error: "Forbidden" },
  });

  const response = await fixture.route.PATCH(requestWithStatus(), {
    params: Promise.resolve({ id: "7" }),
  });

  assert.equal(response.status, 403);
  assert.deepEqual(fixture.calls(), { findCalls: 0, updateCalls: 0 });
});

test("invalid appointment ID returns 404 without database work", async () => {
  const fixture = createFixture();

  const response = await fixture.route.PATCH(requestWithStatus(), {
    params: Promise.resolve({ id: "not-a-number" }),
  });

  assert.equal(response.status, 404);
  assert.deepEqual(fixture.calls(), { findCalls: 0, updateCalls: 0 });
});

test("missing appointment returns 404", async () => {
  const fixture = createFixture({ appointment: null });

  const response = await fixture.route.PATCH(requestWithStatus(), {
    params: Promise.resolve({ id: "7" }),
  });

  assert.equal(response.status, 404);
  assert.equal(fixture.calls().updateCalls, 0);
});

test("already-closed appointment returns 409 and is not updated again", async () => {
  const fixture = createFixture({
    appointment: { id: 7, status: "cancelled", notes: null },
  });

  const response = await fixture.route.PATCH(requestWithStatus(), {
    params: Promise.resolve({ id: "7" }),
  });

  assert.equal(response.status, 409);
  assert.equal(fixture.calls().updateCalls, 0);
});