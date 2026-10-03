import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";
import { z } from "zod";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as jsxRuntime from "react/jsx-runtime";

function load(path, mocks, globals = {}, jsx = false) {
  const source = readFileSync(new URL(path, import.meta.url), "utf8");
  const exports = {};
  vm.runInNewContext(
    ts.transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
        ...(jsx ? { jsx: ts.JsxEmit.ReactJSX } : {}),
      },
    }).outputText,
    {
      exports,
      require: (name) => {
        assert.ok(name in mocks, `Unexpected import: ${name}`);
        return mocks[name];
      },
      Date,
      URL,
      URLSearchParams,
      console,
      ...globals,
    }
  );
  return exports;
}

const schemas = load("../lib/validations/booking.ts", { zod: { z } });
const {
  BOOKING_LIMITS: limits,
  bookingSelectionSchema,
  bookingRequestSchema,
} = schemas;
const base = {
  serviceIds: [1, 2],
  stylistId: null,
  date: "2026-10-20",
  time: "10:00 AM",
  name: "Customer",
  email: "customer@example.com",
  phone: "(530) 555-0100",
  notes: "",
};

test("ID-based selector keeps equal-named options separate and disables only additional choices at four", () => {
  const openDropdownReact = {
    ...React,
    useState: (initial) => [
      typeof initial === "boolean" ? true : initial,
      () => {},
    ],
    useRef: () => ({ current: null }),
    useEffect: () => {},
    useCallback: (callback) => callback,
  };
  const dropdown = load(
    "../components/Dropdown.tsx",
    {
      react: openDropdownReact,
      "react/jsx-runtime": jsxRuntime,
    },
    {},
    true
  ).MultiSelectDropdown;
  const options = [1, 2, 3, 4, 5].map((id) => ({
    id,
    label:
      id <= 2 ? `Same name — 30 min · $25.00 (option ${id})` : `Service ${id}`,
  }));
  const html = renderToStaticMarkup(
    React.createElement(dropdown, {
      label: "Service",
      placeholder: "Select Service(s)",
      options,
      selected: [1, 2, 3, 4],
      maxSelected: limits.services,
      onChange() {},
    })
  );
  assert.match(
    html,
    /Same name — 30 min · \$25.00 \(option 1\), Same name — 30 min · \$25.00 \(option 2\)/
  );
  assert.doesNotMatch(html, /Same name \(#\d+\)/);
  assert.equal((html.match(/disabled=""/g) ?? []).length, 1);
  assert.match(html, /disabled=""[^>]*>.*?Service 5/s);
});

test("selection accepts four distinct IDs and rejects five, empty and malformed arrays", () => {
  for (const count of [1, 2, limits.services]) {
    assert.equal(
      bookingSelectionSchema.safeParse({
        ...base,
        serviceIds: [1, 2, 3, 4].slice(0, count),
      }).success,
      true
    );
  }
  for (const ids of [[], [1, 2, 3, 4, 5], [1, "2"], [0], [1, 1]]) {
    assert.equal(
      bookingSelectionSchema.safeParse({ ...base, serviceIds: ids }).success,
      false
    );
  }
  assert.match(
    bookingSelectionSchema
      .safeParse({ ...base, serviceIds: [1, 2, 3, 4, 5] })
      .error.flatten().fieldErrors.serviceIds[0],
    /up to 4 services/
  );
});

test("raw contact lengths enforce boundary before trimming and preserve saved trimming", () => {
  for (const [field, limit, valid] of [
    ["name", limits.name, "a".repeat(limits.name)],
    [
      "email",
      limits.email,
      `${"a".repeat(limits.email - "@x.co".length)}@x.co`,
    ],
    ["phone", limits.phone, " ".repeat(limits.phone - 10) + "5305550100"],
    ["notes", limits.notes, "n".repeat(limits.notes)],
  ]) {
    assert.equal(
      bookingRequestSchema.safeParse({ ...base, [field]: valid }).success,
      true,
      field
    );
    for (const excessive of [valid + " ", " ".repeat(limit + 1)]) {
      const result = bookingRequestSchema.safeParse({
        ...base,
        [field]: excessive,
      });
      assert.equal(
        result.success,
        false,
        `${field} raw input ${excessive.length}`
      );
      assert.match(
        result.error.flatten().fieldErrors[field][0],
        new RegExp(`${limit} characters or fewer`)
      );
    }
  }
  assert.equal(
    bookingRequestSchema.safeParse({ ...base, phone: "12345" }).success,
    false
  );
  assert.equal(
    bookingRequestSchema.safeParse({ ...base, name: "  " }).success,
    false
  );
  const parsed = bookingRequestSchema.parse({
    ...base,
    name: " Customer ",
    email: " customer@example.com ",
    phone: " 5305550100 ",
    notes: "  ",
  });
  assert.equal(parsed.name, "Customer");
  assert.equal(parsed.email, "customer@example.com");
  assert.equal(parsed.phone, "5305550100");
  assert.equal(parsed.notes, undefined);
  assert.equal(
    bookingRequestSchema.parse({ ...base, notes: "  Hello  " }).notes,
    "Hello"
  );
});
