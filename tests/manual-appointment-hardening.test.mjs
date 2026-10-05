import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as jsxRuntime from "react/jsx-runtime";
import { z } from "zod";
import { loadModule } from "./helpers/loadModule.mjs";

const limits = {
  services: 4,
  name: 100,
  email: 254,
  phone: 32,
  notes: 500,
};

const statusMock = {
  PENDING_STATUS: "pending",
  CONFIRMED_STATUS: "confirmed",
  COMPLETED_STATUS: "completed",
  CANCELLED_STATUS: "cancelled",
  getStatusLabel: (status) => status,
};

const schema = loadModule("lib/validations/manualAppointment.ts", {
  mocks: {
    zod: { z },
    "@/lib/appointmentStatus": statusMock,
    "@/lib/validations/booking": { BOOKING_LIMITS: limits },
  },
}).manualAppointmentSchema;

const valid = {
  serviceId: 1,
  stylistId: null,
  date: "2026-10-20",
  time: "10:00 AM",
  customerName: "Customer",
  customerPhone: "5305550100",
  customerEmail: "customer@example.com",
  notes: "Notes",
  status: "confirmed",
};

test("manual booking enforces shared raw text limits and keeps valid boundaries", () => {
  for (const [field, limit, boundary] of [
    ["customerName", limits.name, "n".repeat(limits.name)],
    [
      "customerEmail",
      limits.email,
      `${"a".repeat(limits.email - "@x.co".length)}@x.co`,
    ],
    [
      "customerPhone",
      limits.phone,
      " ".repeat(limits.phone - 10) + "5305550100",
    ],
    ["notes", limits.notes, "n".repeat(limits.notes)],
  ]) {
    assert.equal(schema.safeParse({ ...valid, [field]: boundary }).success, true);

    const excessive = schema.safeParse({ ...valid, [field]: `${boundary} ` });
    assert.equal(excessive.success, false, field);
    assert.match(
      excessive.error.flatten().fieldErrors[field][0],
      new RegExp(`${limit} characters or fewer`)
    );
  }
});

test("manual booking preserves normalization and accepts empty optional fields", () => {
  for (const optionalFields of [
    { customerEmail: "", notes: "" },
    { customerEmail: null, notes: null },
    { customerEmail: undefined, notes: undefined },
  ]) {
    assert.equal(schema.safeParse({ ...valid, ...optionalFields }).success, true);
  }

  const parsed = schema.parse({
    ...valid,
    customerName: " Customer ",
    customerPhone: " 5305550100 ",
    customerEmail: " customer@example.com ",
    notes: " Notes ",
  });
  assert.equal(parsed.customerName, "Customer");
  assert.equal(parsed.customerPhone, "5305550100");
  assert.equal(parsed.customerEmail, "customer@example.com");
  assert.equal(parsed.notes, "Notes");
});

function loadDialog(reactMock, runtime = jsxRuntime, globals = {}) {
  return loadModule("components/admin/schedule/NewAppointmentDialog.tsx", {
    mocks: {
      react: reactMock,
      "react/jsx-runtime": runtime,
      "@/lib/appointmentStatus": statusMock,
      "@/lib/validations/booking": { BOOKING_LIMITS: limits },
      "./ScheduleDialog": () => null,
    },
    globals,
  });
}

test("manual booking inputs expose the shared browser limits", () => {
  const { AppointmentForm } = loadDialog(React);
  const html = renderToStaticMarkup(
    React.createElement(AppointmentForm, {
      request: { date: "2026-10-20", time: "10:00 AM" },
      onClose() {},
      onCreated() {},
    })
  );

  assert.match(html, new RegExp(`id="[^"]+-name"[^>]*maxLength="${limits.name}"`));
  assert.match(html, new RegExp(`id="[^"]+-phone"[^>]*maxLength="${limits.phone}"`));
  assert.match(html, new RegExp(`id="[^"]+-email"[^>]*maxLength="${limits.email}"`));
  assert.match(html, new RegExp(`id="[^"]+-notes"[^>]*maxLength="${limits.notes}"`));
});

test("a 409 clears only the rejected time and triggers an availability refresh", async () => {
  const initial = [
    [{ id: 1, name: "Service", price: 20, durationMinutes: 30 }],
    [],
    false,
    null,
    [{ time: "10:00 AM", available: true }],
    false,
    null,
    0,
    "1",
    "",
    "2026-10-20",
    "10:00 AM",
    "confirmed",
    "Customer",
    "(530) 555-0100",
    "customer@example.com",
    "Keep this note",
    false,
    {},
    null,
  ];
  const updates = new Map();
  let stateIndex = 0;
  const reactMock = {
    useId: () => "manual",
    useEffect: () => {},
    useState(defaultValue) {
      const index = stateIndex++;
      const value = index < initial.length ? initial[index] : defaultValue;
      return [
        value,
        (next) => {
          updates.set(index, typeof next === "function" ? next(value) : next);
        },
      ];
    },
  };
  const runtime = {
    Fragment: Symbol("Fragment"),
    jsx: (type, props) => ({ type, props }),
    jsxs: (type, props) => ({ type, props }),
  };
  const fetchCalls = [];
  const { AppointmentForm } = loadDialog(reactMock, runtime, {
    AbortController,
    fetch: async (url) => {
      fetchCalls.push(url);
      return {
        ok: false,
        status: 409,
        json: async () => ({
          success: false,
          errors: { time: "This stylist is no longer available at that time" },
        }),
      };
    },
  });

  const form = AppointmentForm({
    request: { date: "2026-10-20", time: "10:00 AM" },
    onClose() {},
    onCreated() {},
  });
  await form.props.onSubmit({ preventDefault() {} });

  assert.deepEqual(fetchCalls, ["/api/admin/appointments"]);
  assert.equal(updates.get(11), "");
  assert.deepEqual(Array.from(updates.get(4)), []);
  assert.equal(updates.get(5), true);
  assert.equal(updates.get(6), null);
  assert.equal(updates.get(7), 1);
  assert.match(updates.get(19), /Choose another time/);
  for (const preservedIndex of [8, 9, 10, 12, 13, 14, 15, 16]) {
    assert.equal(updates.has(preservedIndex), false, `state ${preservedIndex}`);
  }
});
