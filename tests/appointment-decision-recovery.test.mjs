import assert from "node:assert/strict";
import { test } from "node:test";
import * as jsxRuntime from "react/jsx-runtime";
import { NextResponse } from "next/server.js";
import { loadModule } from "./helpers/loadModule.mjs";

const context = { params: Promise.resolve({ id: "42" }) };

function routeFixture({
  token = "a.b.c",
  identity = "approved-id",
  beforeUpdate,
} = {}) {
  const databaseCalls = [];
  const appointment = { id: 42, status: "pending", notes: null };
  const db = {
    appointment: {
      findUnique: async ({ include, select }) => {
        databaseCalls.push("findUnique");
        if (include) {
          return {
            ...appointment,
            service: { name: "Fixture service" },
            stylist: null,
          };
        }
        return select?.status
          ? { status: appointment.status }
          : { ...appointment };
      },
      updateMany: async ({ where, data }) => {
        databaseCalls.push("updateMany");
        beforeUpdate?.(appointment);
        if (where.status !== appointment.status) return { count: 0 };
        Object.assign(appointment, data);
        return { count: 1 };
      },
    },
  };
  const auth = loadModule("lib/adminAuth.ts", {
    mocks: {
      "next/server": { NextResponse },
      "@/lib/supabase": {
        createSupabaseClient: () => ({
          auth: {
            getUser: async () => ({
              data: { user: { id: identity } },
              error: null,
            }),
          },
        }),
      },
    },
    env: { ADMIN_USER_IDS: "approved-id" },
  });
  const route = loadModule("app/api/admin/appointments/[id]/status/route.ts", {
    mocks: {
      "next/server": { NextResponse },
      "@/lib/db": { db },
      "@/lib/adminAuth": auth,
    },
  });
  return {
    route,
    appointment,
    databaseCalls,
    request: (body) => ({
      cookies: {
        get: () => (token ? { value: token } : undefined),
      },
      json: async () => body,
    }),
  };
}

function loadAppointmentDialog(fetchMock) {
  function AppointmentDetailPanel() {}
  function ScheduleDialog() {}

  const loaded = loadModule(
    "components/admin/schedule/AppointmentDetailDialog.tsx",
    {
      mocks: {
        "react/jsx-runtime": jsxRuntime,
        "@/components/admin/AppointmentDetailPanel": {
          default: AppointmentDetailPanel,
        },
        "./ScheduleDialog": { default: ScheduleDialog },
      },
      globals: { fetch: fetchMock },
    }
  );

  return {
    AppointmentDetailDialog: loaded.default,
    AppointmentDetailPanel,
    ScheduleDialog,
  };
}

function fixtureAppointment() {
  return {
    id: 42,
    serviceId: 4,
    startTime: "2030-01-02T18:00:00.000Z",
    endTime: "2030-01-02T18:30:00.000Z",
    customerName: "Fixture Customer",
    customerPhone: "5550100100",
    customerEmail: "fixture@example.invalid",
    notes: null,
    status: "pending",
    source: "online",
    stylist: null,
    service: {
      id: 4,
      name: "Fixture service",
      price: "20.00",
      durationMinutes: 30,
      active: true,
    },
  };
}

test("decision route rejects missing and unapproved sessions before database access", async () => {
  for (const options of [
    { token: null, expectedStatus: 401 },
    { identity: "unapproved-id", expectedStatus: 403 },
  ]) {
    const { route, request, databaseCalls } = routeFixture(options);
    const response = await route.PATCH(
      request({ status: "confirmed" }),
      context
    );

    assert.equal(response.status, options.expectedStatus);
    assert.deepEqual(databaseCalls, []);
  }
});

test("repeated confirmation follows the transition policy without a second write", async () => {
  const { route, request, appointment, databaseCalls } = routeFixture();

  const first = await route.PATCH(request({ status: "confirmed" }), context);
  const repeated = await route.PATCH(request({ status: "confirmed" }), context);

  assert.equal(first.status, 200);
  assert.equal(repeated.status, 409);
  assert.equal(appointment.status, "confirmed");
  assert.equal(databaseCalls.filter((call) => call === "updateMany").length, 1);
});

test("raced decision returns conflict and preserves the concurrently saved status", async () => {
  const { route, request, appointment, databaseCalls } = routeFixture({
    beforeUpdate: (current) => {
      current.status = "confirmed";
    },
  });

  const response = await route.PATCH(
    request({ status: "rejected", reason: "Duplicate" }),
    context
  );

  assert.equal(response.status, 409);
  assert.equal(appointment.status, "confirmed");
  assert.equal(databaseCalls.filter((call) => call === "updateMany").length, 1);
});

test("schedule detail dialog uses the shared panel and refreshes then closes after success", async () => {
  const calls = [];
  const { AppointmentDetailDialog, AppointmentDetailPanel, ScheduleDialog } =
    loadAppointmentDialog(async (url, options) => {
      calls.push({ url, options });
      return { ok: true, status: 200, json: async () => ({ success: true }) };
    });
  let refreshes = 0;
  let closes = 0;
  const appointment = fixtureAppointment();
  const dialog = AppointmentDetailDialog({
    appointment,
    onStatusChange: () => {
      refreshes++;
    },
    onClose: () => {
      closes++;
    },
  });
  const panel = dialog.props.children;

  assert.equal(dialog.type, ScheduleDialog);
  assert.equal(panel.type, AppointmentDetailPanel);
  assert.equal(panel.props.appointment.id, appointment.id);
  await panel.props.onApprove();

  assert.equal(calls[0].url, "/api/admin/appointments/42/status");
  assert.equal(calls[0].options.method, "PATCH");
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    status: "confirmed",
  });
  assert.equal(refreshes, 1);
  assert.equal(closes, 1);
});

test("schedule detail dialog refreshes on conflict but stays open", async () => {
  const { AppointmentDetailDialog } = loadAppointmentDialog(async () => ({
    ok: false,
    status: 409,
    json: async () => ({
      error: "Appointment status changed before this request could be applied",
    }),
  }));
  let refreshes = 0;
  let closes = 0;
  const dialog = AppointmentDetailDialog({
    appointment: fixtureAppointment(),
    onStatusChange: () => {
      refreshes++;
    },
    onClose: () => {
      closes++;
    },
  });

  await assert.rejects(
    dialog.props.children.props.onApprove(),
    /status changed/
  );
  assert.equal(refreshes, 1);
  assert.equal(closes, 0);
});
