import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import * as jsxRuntime from "react/jsx-runtime";
import { z } from "zod";
import { loadModule } from "./helpers/loadModule.mjs";

const { BOOKING_LIMITS, bookingContactSchemas } = loadModule("lib/validations/booking.ts", {
  mocks: { zod: { z } },
});
const contact = { name: "Fixture Customer", email: "fixture@example.invalid", phone: "(530) 555-0100", notes: "Keep these notes" };
const selection = { serviceIds: [1], stylistId: 2, date: "2026-10-20", time: "10:00 AM" };

function formFixture(response) {
  const states = [false, null];
  const changes = [];
  let conflicts = [];
  let requests = 0;
  const form = loadModule("components/BookingForm.tsx", {
    mocks: {
      react: { ...React, useState: () => [states.shift(), (value) => changes.push(value)], useRef: () => ({ current: false }) },
      "react/jsx-runtime": jsxRuntime,
      "@/lib/validations/booking": { BOOKING_LIMITS, bookingContactSchemas },
      "@/lib/bookingRetry": { bookingRetryMessage: (header) => `Retry in ${header} seconds` },
    },
    globals: { fetch: async () => { requests++; return response; } },
  }).default({
    selection, contact, touched: { name: false, email: false, phone: false, notes: false }, selectionReady: true,
    services: [{ id: 1, name: "Fixture", price: 20, durationMinutes: 30 }],
    stylists: [{ id: 2, name: "Fixture Stylist" }],
    onContactChange() {}, onTouchedChange() {}, onBook() {}, onBack() {},
    onTimeConflict: (message) => conflicts.push(message),
  });
  return { form, changes, conflicts, get requests() { return requests; } };
}

test("time-only 409 signals recovery; 429 retains retry guidance and contacts", async () => {
  const taken = formFixture({ ok: false, status: 409, json: async () => ({ success: false, errors: { time: "Selected time is no longer available" } }) });
  await taken.form.props.onSubmit({ preventDefault() {} });
  assert.equal(taken.requests, 1);
  assert.deepEqual(taken.conflicts, ["Selected time is no longer available"]);
  const limited = formFixture({ ok: false, status: 429, headers: { get: () => "119" }, json: async () => ({ error: "limited" }) });
  await limited.form.props.onSubmit({ preventDefault() {} });
  assert.equal(limited.requests, 1);
  assert.deepEqual(limited.conflicts, []);
  assert.ok(limited.changes.includes("Retry in 119 seconds"));
  assert.equal(contact.notes, "Keep these notes");
});

test("non-time 409 remains an error, not a time conflict", async () => {
  const other = formFixture({ ok: false, status: 409, json: async () => ({ errors: { stylistId: "Stylist unavailable" } }) });
  await other.form.props.onSubmit({ preventDefault() {} });
  assert.deepEqual(other.conflicts, []);
  assert.ok(other.changes.includes("Stylist unavailable"));
});

function containerFixture(fetchMock, { actualForm = false } = {}) {
  const state = [];
  const refs = [];
  const effects = [];
  let cursor = 0;
  let refCursor = 0;
  let effectCursor = 0;
  const react = {
    useState(initial) {
      const index = cursor++;
      if (!(index in state)) state[index] = initial;
      return [state[index], (next) => {
        state[index] = typeof next === "function" ? next(state[index]) : next;
      }];
    },
    useRef(initial) {
      const index = refCursor++;
      return refs[index] ??= { current: initial };
    },
    useEffect(callback, dependencies) {
      const index = effectCursor++;
      const previous = effects[index];
      if (!previous || dependencies.some((item, i) => !Object.is(item, previous.dependencies[i]))) {
        effects[index] = { callback, dependencies, pending: true, cleanup: previous?.cleanup };
      }
    },
  };
  const formState = [];
  const formRefs = [];
  let formCursor = 0;
  let formRefCursor = 0;
  const formReact = {
    ...React,
    useState(initial) {
      const index = formCursor++;
      if (!(index in formState)) formState[index] = initial;
      return [formState[index], (next) => {
        formState[index] = typeof next === "function" ? next(formState[index]) : next;
      }];
    },
    useRef(initial) {
      const index = formRefCursor++;
      return formRefs[index] ??= { current: initial };
    },
  };
  const BookingForm = actualForm ? loadModule("components/BookingForm.tsx", {
    mocks: {
      react: formReact,
      "react/jsx-runtime": jsxRuntime,
      "@/lib/validations/booking": { BOOKING_LIMITS, bookingContactSchemas },
      "@/lib/bookingRetry": { bookingRetryMessage: (value) => `Retry in ${value} seconds` },
    },
    globals: { fetch: fetchMock },
  }).default : () => null;
  const picker = () => null;
  const { default: Container } = loadModule("components/BookingContainer.tsx", {
    mocks: {
      react,
      "react/jsx-runtime": jsxRuntime,
      "./Dropdown": {
        MultiSelectDropdown: picker, SingleSelectDropdown: picker,
        DatePickerDropdown: picker, TimePickerDropdown: picker,
      },
      "./BookingForm": { default: BookingForm },
      "@/lib/validations/booking": { BOOKING_LIMITS, bookingSelectionSchema: { safeParse: () => ({ success: true }) } },
      "@/lib/dateUtils": { toDateParam: (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}` },
    },
    globals: { fetch: fetchMock, AbortController },
  });
  function render() {
    cursor = refCursor = effectCursor = 0;
    const tree = Container();
    for (const effect of effects) {
      if (effect?.pending) {
        effect.cleanup?.();
        effect.cleanup = effect.callback();
        effect.pending = false;
      }
    }
    return tree;
  }
  function find(tree, predicate) {
    if (!tree || typeof tree !== "object") return null;
    if (predicate(tree)) return tree;
    for (const child of React.Children.toArray(tree.props?.children)) {
      const result = find(child, predicate);
      if (result) return result;
    }
    return null;
  }
  const named = (tree, label) => find(tree, (node) => node.props?.label === label);
  const button = (tree, name) => find(tree, (node) => node.type === "button" && React.Children.toArray(node.props.children).includes(name));
  function renderForm(tree) {
    const element = find(tree, (node) => node.type === BookingForm && node.props?.onTimeConflict);
    assert.ok(element, "the container renders the booking form");
    formCursor = formRefCursor = 0;
    return BookingForm(element.props);
  }
  function resetForm() {
    formState.length = 0;
    formRefs.length = 0;
  }
  return { render, named, button, find, renderForm, resetForm };
}

test("actual booking form POST 409 restores all fields via container and reloads the existing time picker", async () => {
  const calls = [];
  const refreshes = [];
  const fixture = containerFixture((url, options) => {
    calls.push({ url, options });
    if (url === "/api/services") return Promise.resolve({ json: async () => [{ id: 1, name: "Fixture", durationMinutes: 30, price: 20 }] });
    if (url === "/api/stylists") return Promise.resolve({ json: async () => [{ id: 2, name: "Fixture Stylist" }] });
    if (url === "/api/availability/dates") return Promise.resolve({ ok: true, json: async () => [] });
    if (url === "/api/bookings/validate") return Promise.resolve({ ok: true });
    if (url === "/api/bookings") return Promise.resolve({
      ok: false,
      status: 409,
      json: async () => ({ success: false, errors: { time: "Selected time is no longer available" } }),
    });
    if (String(url).startsWith("/api/availability/times?")) {
      const attempt = refreshes.length;
      refreshes.push(url);
      return Promise.resolve({
        ok: true,
        json: async () => [{ time: attempt === 0 ? "10:00 AM" : "11:00 AM", available: true }],
      });
    }
    throw new Error(`Unexpected URL: ${url}`);
  }, { actualForm: true });
  const settle = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
  let tree = fixture.render();
  await settle();
  tree = fixture.render();
  fixture.named(tree, "Service").props.onChange([1]);
  fixture.named(tree, "Stylist").props.onChange("Fixture Stylist");
  fixture.named(tree, "Date").props.onChange(new Date(2026, 9, 20));
  fixture.render();
  await settle();
  tree = fixture.render();
  fixture.named(tree, "Time").props.onChange("10:00 AM");
  tree = fixture.render();
  await fixture.button(tree, "Continue").props.onClick();
  tree = fixture.render();
  let form = fixture.renderForm(tree);
  // Use the real form's change handlers; two fields changed before a rerender
  // must both survive React's batched updates to parent-owned state.
  fixture.named(form, "Name").props.onChange(contact.name);
  fixture.named(form, "Email").props.onChange(contact.email);
  fixture.named(form, "Phone").props.onChange(contact.phone);
  fixture.find(form, (node) => node.type === "textarea").props.onChange({ target: { value: contact.notes } });
  fixture.named(form, "Name").props.onBlur();
  fixture.named(form, "Email").props.onBlur();
  tree = fixture.render();
  const formElement = fixture.find(tree, (node) => node.props?.onTimeConflict);
  assert.equal(formElement.props.touched.name, true);
  assert.equal(formElement.props.touched.email, true);
  form = fixture.renderForm(tree);
  assert.equal(fixture.named(form, "Name").props.value, contact.name);
  assert.equal(fixture.named(form, "Email").props.value, contact.email);
  assert.equal(fixture.named(form, "Phone").props.value, contact.phone);
  assert.equal(fixture.find(form, (node) => node.type === "textarea").props.value, contact.notes);
  assert.equal(fixture.named(form, "Name").props.error, null);
  assert.equal(fixture.named(form, "Email").props.error, null);

  let prevented = 0;
  await form.props.onSubmit({ preventDefault() { prevented++; } });
  assert.equal(prevented, 1);
  const posts = calls.filter(({ url }) => url === "/api/bookings");
  assert.equal(posts.length, 1, "only one intercepted booking request was sent");
  assert.deepEqual(JSON.parse(posts[0].options.body), { ...selection, ...contact });
  tree = fixture.render();
  fixture.resetForm();
  assert.ok(fixture.named(tree, "Service"));
  assert.deepEqual(fixture.named(tree, "Service").props.selected, [1]);
  assert.equal(fixture.named(tree, "Stylist").props.value, "Fixture Stylist");
  assert.equal(fixture.named(tree, "Date").props.value.getDate(), 20);
  assert.equal(fixture.named(tree, "Time").props.value, "");
  assert.equal(refreshes.length, 2, "409 triggers an availability reload for the same selection");
  assert.equal(fixture.button(tree, "Continue").props.disabled, true);
  await settle();
  tree = fixture.render();
  fixture.named(tree, "Time").props.onChange("11:00 AM");
  tree = fixture.render();
  await fixture.button(tree, "Continue").props.onClick();
  tree = fixture.render();
  form = fixture.renderForm(tree);
  for (const field of ["Name", "Email", "Phone"]) {
    assert.equal(fixture.named(form, field).props.value, contact[field.toLowerCase()]);
  }
  assert.equal(fixture.find(form, (node) => node.type === "textarea").props.value, contact.notes);
  assert.equal(calls.filter(({ url }) => url === "/api/bookings").length, 1);
});

test("Back and time-conflict recovery preserve contact and notes and refresh the same selection", async () => {
  const pendingTimes = [];
  const fixture = containerFixture((url) => {
    if (url === "/api/services") return Promise.resolve({ json: async () => [{ id: 1, name: "Fixture", durationMinutes: 30, price: 20 }] });
    if (url === "/api/stylists") return Promise.resolve({ json: async () => [{ id: 2, name: "Fixture Stylist" }] });
    if (url === "/api/availability/dates") return Promise.resolve({ ok: true, json: async () => [] });
    if (url === "/api/bookings/validate") return Promise.resolve({ ok: true });
    return new Promise((resolve) => pendingTimes.push(resolve));
  });
  const settle = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
  let tree = fixture.render();
  await settle();
  tree = fixture.render();
  fixture.named(tree, "Service").props.onChange([1]);
  fixture.named(tree, "Stylist").props.onChange("Fixture Stylist");
  fixture.named(tree, "Date").props.onChange(new Date(2026, 9, 20));
  fixture.render();
  pendingTimes[0]({ ok: true, json: async () => [{ time: "10:00 AM", available: true }] });
  await settle();
  tree = fixture.render();
  fixture.named(tree, "Time").props.onChange("10:00 AM");
  tree = fixture.render();
  await fixture.button(tree, "Continue").props.onClick();
  tree = fixture.render();
  let form = fixture.find(tree, (node) => node.props?.onTimeConflict);
  assert.ok(form);
  form.props.onContactChange(contact);
  form.props.onBack();
  tree = fixture.render();
  assert.ok(fixture.named(tree, "Service"));
  await fixture.button(tree, "Continue").props.onClick();
  tree = fixture.render();
  form = fixture.find(tree, (node) => node.props?.onTimeConflict);
  assert.deepEqual(JSON.parse(JSON.stringify(form.props.contact)), contact);
  form.props.onTimeConflict("Selected time is no longer available");
  tree = fixture.render();
  assert.deepEqual(fixture.named(tree, "Service").props.selected, [1]);
  assert.equal(fixture.named(tree, "Stylist").props.value, "Fixture Stylist");
  assert.ok(fixture.named(tree, "Date").props.value);
  assert.equal(fixture.named(tree, "Time").props.value, "");
  assert.equal(pendingTimes.length, 2, "time conflict reloads even with the same date and duration");
  assert.equal(fixture.button(tree, "Continue").props.disabled, true);
  pendingTimes[1]({ ok: true, json: async () => [{ time: "11:00 AM", available: true }] });
  await settle();
  tree = fixture.render();
  fixture.named(tree, "Time").props.onChange("11:00 AM");
  tree = fixture.render();
  await fixture.button(tree, "Continue").props.onClick();
  tree = fixture.render();
  form = fixture.find(tree, (node) => node.props?.onTimeConflict);
  assert.deepEqual(JSON.parse(JSON.stringify(form.props.contact)), contact);
  assert.equal(form.props.selection.time, "11:00 AM");
});

test("outdated availability, failures, and stale full-selection validation cannot advance", async () => {
  const pendingTimes = [];
  let finishValidation;
  const calls = [];
  const fixture = containerFixture((url, options) => {
    calls.push(String(url));
    if (url === "/api/services") return Promise.resolve({ json: async () => [{ id: 1, name: "Fixture", durationMinutes: 30, price: 20 }] });
    if (url === "/api/stylists") return Promise.resolve({ json: async () => [{ id: 2, name: "Fixture Stylist" }] });
    if (url === "/api/availability/dates") return Promise.resolve({ ok: true, json: async () => [] });
    if (url === "/api/bookings/validate") return new Promise((resolve) => { finishValidation = resolve; });
    return new Promise((resolve) => pendingTimes.push({ resolve, signal: options.signal }));
  });
  const settle = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
  let tree = fixture.render();
  await settle();
  tree = fixture.render();
  fixture.named(tree, "Service").props.onChange([1]);
  fixture.named(tree, "Date").props.onChange(new Date(2026, 9, 20));
  tree = fixture.render();
  assert.equal(pendingTimes.length, 1);
  assert.equal(fixture.button(tree, "Continue").props.disabled, true);

  fixture.named(tree, "Date").props.onChange(new Date(2026, 9, 21));
  tree = fixture.render();
  assert.equal(pendingTimes.length, 2);
  pendingTimes[0].resolve({ ok: true, json: async () => [{ time: "10:00 AM", available: true }] });
  await settle();
  tree = fixture.render();
  assert.equal(fixture.button(tree, "Continue").props.disabled, true);
  pendingTimes[1].resolve({ ok: false, status: 500 });
  await settle();
  tree = fixture.render();
  assert.equal(fixture.button(tree, "Continue").props.disabled, true);
  assert.ok(fixture.button(tree, "Retry loading times"));
  fixture.button(tree, "Retry loading times").props.onClick();
  tree = fixture.render();
  assert.equal(pendingTimes.length, 3);
  assert.equal(fixture.button(tree, "Continue").props.disabled, true);
  pendingTimes[2].resolve({ ok: true, json: async () => [{ time: "10:00 AM", available: true }] });
  await settle();
  tree = fixture.render();
  fixture.named(tree, "Time").props.onChange("10:00 AM");
  tree = fixture.render();
  assert.equal(fixture.button(tree, "Continue").props.disabled, false);
  const validating = fixture.button(tree, "Continue").props.onClick();
  fixture.named(tree, "Stylist").props.onChange("Fixture Stylist");
  fixture.render();
  finishValidation({ ok: true });
  await validating;
  tree = fixture.render();
  assert.ok(fixture.named(tree, "Service"), "changing only stylist must prevent stale validation from advancing");
  assert.equal(calls.filter((url) => url === "/api/bookings/validate").length, 1);
});

test("dates failure and malformed time response keep Continue disabled until retries succeed", async () => {
  let datesCalls = 0;
  let timeCalls = 0;
  const fixture = containerFixture((url) => {
    if (url === "/api/services") return Promise.resolve({ json: async () => [{ id: 1, name: "Fixture", durationMinutes: 30, price: 20 }] });
    if (url === "/api/stylists") return Promise.resolve({ json: async () => [] });
    if (url === "/api/availability/dates") {
      datesCalls++;
      return Promise.resolve(datesCalls === 1 ? { ok: false, status: 500 } : { ok: true, json: async () => [] });
    }
    timeCalls++;
    return Promise.resolve(timeCalls === 1 ? { ok: true, json: async () => ({ error: "Not an array" }) } : timeCalls === 3 ? { ok: false, status: 503 } : { ok: true, json: async () => [{ time: "10:00 AM", available: true }] });
  });
  const settle = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
  let tree = fixture.render();
  await settle();
  tree = fixture.render();
  fixture.named(tree, "Service").props.onChange([1]);
  fixture.named(tree, "Date").props.onChange(new Date(2026, 9, 20));
  fixture.render();
  await settle();
  tree = fixture.render();
  assert.ok(fixture.button(tree, "Could not load dates. Retry loading dates"));
  assert.ok(fixture.button(tree, "Retry loading times"));
  fixture.named(tree, "Time").props.onChange("10:00 AM");
  tree = fixture.render();
  assert.equal(fixture.button(tree, "Continue").props.disabled, true);
  fixture.button(tree, "Retry loading times").props.onClick();
  fixture.button(tree, "Could not load dates. Retry loading dates").props.onClick();
  fixture.render();
  await settle();
  tree = fixture.render();
  fixture.named(tree, "Time").props.onChange("10:00 AM");
  tree = fixture.render();
  assert.equal(fixture.button(tree, "Continue").props.disabled, false);
  fixture.named(tree, "Date").props.onChange(new Date(2026, 9, 21));
  tree = fixture.render();
  assert.equal(fixture.named(tree, "Time").props.value, "", "changing dates clears the previous time immediately");
  await settle();
  tree = fixture.render();
  assert.ok(fixture.button(tree, "Retry loading times"));
  assert.equal(fixture.named(tree, "Time").props.value, "", "failed availability must not show the previous date's time");
  assert.equal(fixture.button(tree, "Continue").props.disabled, true);
});
