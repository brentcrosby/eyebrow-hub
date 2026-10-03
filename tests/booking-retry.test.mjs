import assert from "node:assert/strict";
import { test } from "node:test";
import { bookingRetryMessage } from "../lib/bookingRetry.ts";

test("customer retry guidance rounds up to whole minutes", () => {
  assert.equal(
    bookingRetryMessage("1"),
    "Too many requests. Please try again in 1 minute."
  );
  assert.equal(
    bookingRetryMessage("119"),
    "Too many requests. Please try again in 2 minutes."
  );
  assert.equal(
    bookingRetryMessage("900"),
    "Too many requests. Please try again in 15 minutes."
  );
});

test("missing or invalid retry times use a safe fallback", () => {
  for (const retryAfter of [null, "", "0", "-1", "untrusted"]) {
    assert.equal(
      bookingRetryMessage(retryAfter),
      "Too many requests. Please try again later."
    );
  }
});
