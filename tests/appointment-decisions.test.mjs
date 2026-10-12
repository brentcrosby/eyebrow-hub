import assert from "node:assert/strict";
import { test } from "node:test";
import { NextResponse } from "next/server.js";
import { loadModule } from "./helpers/loadModule.mjs";

function loadStatusRoute(db) {
  return loadModule("app/api/admin/appointments/[id]/status/route.ts", {
    mocks: {
      "next/server": { NextResponse },
      "@/lib/db": { db },
      "@/lib/adminAuth": {
        requireAdmin: async () => ({ authenticated: true }),
      },
    },
  });
}

function fixture(initialStatus, updateAppointment) {
  const writes = [];
  const appointment = { id: 42, status: initialStatus, notes: null };
  const db = {
    appointment: {
      findUnique: async ({ include }) =>
        include ? { ...appointment, service: null, stylist: null } : { ...appointment },
      updateMany: async ({ where, data }) => {
        writes.push({ where, data });
        return updateAppointment(appointment, where, data);
      },
    },
  };
  const route = loadStatusRoute(db);
  return { route, appointment, writes };
}

function successfulUpdate(appointment, where, data) {
  if (where.status !== appointment.status) return { count: 0 };
  Object.assign(appointment, data);
  return { count: 1 };
}

function request(body) {
  return { json: async () => body };
}

const context = { params: Promise.resolve({ id: "42" }) };

test("admin can confirm a pending appointment", async () => {
  const f = fixture("pending", successfulUpdate);

  const response = await f.route.PATCH(
    request({ status: "confirmed" }),
    context
  );

  assert.equal(response.status, 200);
  assert.equal(f.appointment.status, "confirmed");
  assert.equal(f.writes.length, 1);
});

test("invalid decision returns conflict without writing", async () => {
  const f = fixture("confirmed", successfulUpdate);

  const response = await f.route.PATCH(
    request({ status: "rejected", reason: "Duplicate" }),
    context
  );

  assert.equal(response.status, 409);
  assert.equal(f.appointment.status, "confirmed");
  assert.deepEqual(f.writes, []);
});

test("raced status change returns conflict and preserves the newer status", async () => {
  const f = fixture("pending", (appointment) => {
    appointment.status = "cancelled";
    return { count: 0 };
  });

  const response = await f.route.PATCH(
    request({ status: "confirmed" }),
    context
  );

  assert.equal(response.status, 409);
  assert.equal(f.appointment.status, "cancelled");
  assert.equal(f.writes.length, 1);
});
