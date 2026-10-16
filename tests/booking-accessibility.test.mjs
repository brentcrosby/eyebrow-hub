import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as jsxRuntime from "react/jsx-runtime";
import { z } from "zod";
import { loadModule } from "./helpers/loadModule.mjs";

test("booking fields, picker triggers and native submit guard", async () => {
  const { BOOKING_LIMITS, bookingContactSchemas } = loadModule("lib/validations/booking.ts", {
    mocks: { zod: { z } },
  });
  const values = ["", "bad", "123", "", { name: true, email: true, phone: true, notes: false }, false, null];
  const mockReact = {
    ...React,
    useState: () => [values.shift(), () => {}],
    useRef: () => ({ current: false }),
  };
  const { default: BookingForm } = loadModule("components/BookingForm.tsx", {
    mocks: {
      react: mockReact,
      "react/jsx-runtime": jsxRuntime,
      "@/lib/validations/booking": { BOOKING_LIMITS, bookingContactSchemas },
      "@/lib/bookingRetry": { bookingRetryMessage: () => "Retry later" },
    },
  });
  const props = {
    selection: { serviceIds: [1], stylistId: null, date: "2026-10-20", time: "10:00 AM" },
    services: [{ id: 1, name: "Fixture", price: 20, durationMinutes: 30 }],
    stylists: [],
    onBook() {},
    onBack() {},
  };
  const html = renderToStaticMarkup(React.createElement(BookingForm, props));
  assert.match(html, /<form[^>]*noValidate=""/);
  for (const field of ["name", "email", "phone"]) {
    assert.match(html, new RegExp(`htmlFor="booking-${field}"|for="booking-${field}"`));
    assert.match(html, new RegExp(`id="booking-${field}"[^>]*aria-invalid="true"[^>]*aria-describedby="booking-${field}-error"`));
    assert.match(html, new RegExp(`id="booking-${field}-error"`));
  }
  assert.match(html, /type="submit"/);

  let focused = 0;
  let closed = 0;
  let refs = 0;
  const openReact = {
    ...React,
    useState: (initial) => [typeof initial === "boolean" ? true : initial, (next) => {
      if (next === false) closed++;
    }],
    useRef: () => ({ current: ++refs % 2 === 0 ? { focus() { focused++; } } : null }),
    useEffect: () => {},
    useCallback: (callback) => callback,
  };
  const pickers = loadModule("components/Dropdown.tsx", {
    mocks: { react: openReact, "react/jsx-runtime": jsxRuntime },
  });
  const fixtures = [
    [pickers.MultiSelectDropdown, { label: "Service", placeholder: "Select services", options: [{ id: 1, label: "Fixture" }], selected: [], maxSelected: 4, onChange() {} }],
    [pickers.SingleSelectDropdown, { label: "Stylist", options: ["Next Available"], value: "Next Available", onChange() {} }],
    [pickers.DatePickerDropdown, { label: "Date", value: null, onChange() {} }],
    [pickers.TimePickerDropdown, { label: "Time", value: "", slots: [], onChange() {} }],
  ];
  for (const [Picker, pickerProps] of fixtures) {
    refs = 0;
    const markup = renderToStaticMarkup(React.createElement(Picker, pickerProps));
    assert.match(markup, new RegExp(`aria-label="${pickerProps.label}:`));
    assert.match(markup, /aria-expanded="true"/);
    assert.match(markup, /focus-visible/);
    refs = 0;
    const root = Picker(pickerProps);
    let prevented = 0;
    root.props.onKeyDown({ key: "Escape", preventDefault() { prevented++; }, stopPropagation() {} });
    assert.equal(prevented, 1);
  }
  assert.equal(focused, 4);
  assert.equal(closed, 4);

  const valid = ["Fixture Customer", "fixture@example.invalid", "(530) 555-0100", "", { name: false, email: false, phone: false, notes: false }, false, null];
  let requests = 0;
  let finishRequest;
  const pending = new Promise((resolve) => { finishRequest = resolve; });
  const { default: ValidForm } = loadModule("components/BookingForm.tsx", {
    mocks: {
      react: { ...React, useState: () => [valid.shift(), () => {}], useRef: () => ({ current: false }) },
      "react/jsx-runtime": jsxRuntime,
      "@/lib/validations/booking": { BOOKING_LIMITS, bookingContactSchemas },
      "@/lib/bookingRetry": { bookingRetryMessage: () => "Retry later" },
    },
    globals: { fetch: () => { requests++; return pending; } },
  });
  const form = ValidForm(props);
  let prevented = 0;
  const event = { preventDefault() { prevented++; } };
  const first = form.props.onSubmit(event);
  await form.props.onSubmit(event);
  assert.equal(requests, 1);
  assert.equal(prevented, 2);
  finishRequest({ ok: false, status: 500, json: async () => ({ error: "Fixture error" }) });
  await first;
});