import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const source = readFileSync(
  new URL("../app/admin/(panel)/services/page.tsx", import.meta.url),
  "utf8"
);

test("service management loads and describes the salon-wide catalog", () => {
  assert.match(source, /fetch\("\/api\/admin\/services"\)/);
  assert.match(source, /salon-wide service catalog/);
  assert.match(source, /apply to every\s+stylist and booking flow/);
  assert.doesNotMatch(
    source,
    /employee-services|selectedEmployee|fetchEmployees/
  );
});

test("service fields have linked labels and validation messages", () => {
  for (const [id, errorId] of [
    ["service-name", "service-name-error"],
    ["service-duration", "service-duration-error"],
    ["service-price", "service-price-error"],
  ]) {
    assert.match(source, new RegExp(`htmlFor="${id}"`));
    assert.match(source, new RegExp(`id="${id}"`));
    assert.match(source, new RegExp(`id="${errorId}"`));
    assert.match(source, new RegExp(`"${errorId}"`));
  }

  assert.match(source, /htmlFor="active-toggle"/);
  assert.match(source, /id="active-toggle"/);
});
