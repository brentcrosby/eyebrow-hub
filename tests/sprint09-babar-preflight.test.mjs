import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { checkEnvironment } from "../scripts/preflight.mjs";

const preflightScript = fileURLToPath(new URL("../scripts/preflight.mjs", import.meta.url));

// Made-up values only, generated per run so nothing secret-looking is committed
// (the secret scan checks every commit). The secret is long enough on purpose.
const fake = (bytes) => randomBytes(bytes).toString("hex");
const FAKE_SECRET = fake(24);
const valid = {
  DATABASE_URL: "postgresql://ci:ci@localhost:5432/ci",
  NEXT_PUBLIC_SUPABASE_URL: "https://fixture.supabase.invalid",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: fake(8),
  ADMIN_USER_IDS: "00000000-0000-4000-8000-000000000001",
  BOOKING_RATE_LIMIT_SECRET: FAKE_SECRET,
  BOOKING_CLIENT_IP_HEADER: "x-trusted-client-ip",
  NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: fake(8),
};

// Runs the real script with only the given settings, from an empty folder so no
// .env or .env.local file is picked up.
function runPreflight(env) {
  const cwd = mkdtempSync(join(tmpdir(), "preflight-"));
  try {
    return spawnSync(process.execPath, [preflightScript], {
      cwd,
      env: { PATH: process.env.PATH, SystemRoot: process.env.SystemRoot, ...env },
      encoding: "utf8",
    });
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
}

test("a complete configuration passes with no problems", () => {
  assert.deepEqual(checkEnvironment(valid), { errors: [], warnings: [] });
});

test("each missing required setting is named", () => {
  const { errors } = checkEnvironment({});
  for (const name of [
    "DATABASE_URL",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "ADMIN_USER_IDS",
    "BOOKING_RATE_LIMIT_SECRET",
    "BOOKING_CLIENT_IP_HEADER",
  ]) {
    assert.ok(errors.some((message) => message.startsWith(name)), `${name} should be reported`);
  }
});

test("a short limiter secret is rejected, matching the limiter's 32-character rule", () => {
  const { errors } = checkEnvironment({ ...valid, BOOKING_RATE_LIMIT_SECRET: "x".repeat(31) });
  assert.deepEqual(errors, ["BOOKING_RATE_LIMIT_SECRET must be at least 32 characters (it has 31)."]);
});

test("the secret pasted into the header setting is caught", () => {
  const { errors } = checkEnvironment({ ...valid, BOOKING_CLIENT_IP_HEADER: FAKE_SECRET });
  assert.equal(errors.length, 1);
  assert.match(errors[0], /holds the same value as BOOKING_RATE_LIMIT_SECRET/);
});

test("the header name follows the limiter's rule; client-settable headers only warn", () => {
  assert.match(
    checkEnvironment({ ...valid, BOOKING_CLIENT_IP_HEADER: "x trusted ip" }).errors[0],
    /must be a header name/
  );
  const forwarded = checkEnvironment({ ...valid, BOOKING_CLIENT_IP_HEADER: "X-Forwarded-For" });
  assert.deepEqual(forwarded.errors, []);
  assert.match(forwarded.warnings[0], /x-forwarded-for, which clients can send/);
});

test("on Vercel the header setting isn't needed", () => {
  const { errors } = checkEnvironment({ ...valid, VERCEL: "1", BOOKING_CLIENT_IP_HEADER: undefined });
  assert.deepEqual(errors, []);
});

test("admin IDs must be Supabase user IDs, and an email is reported by position only", () => {
  const { errors } = checkEnvironment({
    ...valid,
    ADMIN_USER_IDS: `${valid.ADMIN_USER_IDS}, owner@example.invalid`,
  });
  assert.equal(errors.length, 1);
  assert.match(errors[0], /entry 2 is not a Supabase user ID/);
  assert.doesNotMatch(errors[0], /example\.invalid/);
});

test("bad URLs are rejected; plain http is allowed only for a local Supabase", () => {
  assert.match(
    checkEnvironment({ ...valid, DATABASE_URL: "mysql://ci:ci@localhost/ci" }).errors[0],
    /not a postgresql:\/\//
  );
  assert.match(
    checkEnvironment({ ...valid, NEXT_PUBLIC_SUPABASE_URL: "http://fixture.supabase.invalid" }).errors[0],
    /must be an https:\/\//
  );
  assert.deepEqual(
    checkEnvironment({ ...valid, NEXT_PUBLIC_SUPABASE_URL: "http://localhost:54321" }).errors,
    []
  );
});

test("optional and leftover settings only warn", () => {
  const { errors, warnings } = checkEnvironment({
    ...valid,
    NEXT_PUBLIC_GOOGLE_MAPS_API_KEY: undefined,
    ALLOW_DEMO_SEED: "1",
  });
  assert.deepEqual(errors, []);
  assert.equal(warnings.length, 2);
});

test("the script exits 1 on problems and never prints a setting's value", () => {
  const result = runPreflight({ ...valid, BOOKING_RATE_LIMIT_SECRET: undefined, BOOKING_CLIENT_IP_HEADER: FAKE_SECRET });
  assert.equal(result.status, 1);
  const output = result.stdout + result.stderr;
  assert.match(output, /ERROR {2}BOOKING_RATE_LIMIT_SECRET is missing/);
  assert.match(output, /Preflight failed/);
  for (const value of [FAKE_SECRET, valid.DATABASE_URL, valid.NEXT_PUBLIC_SUPABASE_ANON_KEY, valid.ADMIN_USER_IDS]) {
    assert.ok(!output.includes(value), "a setting value was printed");
  }
});

test("the script exits 0 with a complete configuration", () => {
  const result = runPreflight(valid);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Preflight passed\./);
});
