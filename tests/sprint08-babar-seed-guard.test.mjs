import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { demoSeedRefusal, describeTarget } from "../prisma/seedGuard.mjs";

const seedScript = fileURLToPath(new URL("../prisma/seed.js", import.meta.url));

// Port 9 on loopback: nothing listens there, so if the guard ever let a run
// through, it could only fail to connect, never write to a real database.
const UNREACHABLE = "postgresql://guard:not-a-secret@127.0.0.1:9/no_such_db";

// Runs seed.js from an empty folder (so no real .env is loaded) with only the
// environment the test chooses.
function runSeed({ env = {}, dotenv = "" } = {}) {
  const dir = mkdtempSync(join(tmpdir(), "seed-guard-"));
  try {
    if (dotenv) writeFileSync(join(dir, ".env"), dotenv);
    const base = { ...process.env };
    delete base.ALLOW_DEMO_SEED;
    delete base.DATABASE_URL;
    return spawnSync(process.execPath, [seedScript], {
      cwd: dir,
      env: { ...base, ...env },
      encoding: "utf8",
      timeout: 20_000,
    });
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

test("refuses unless ALLOW_DEMO_SEED is exactly 1", () => {
  const databaseUrl = "postgresql://user@localhost:5432/demo";
  for (const optIn of [undefined, "", "0", "true", "yes", " 1"]) {
    assert.match(demoSeedRefusal({ optIn, databaseUrl }), /Refusing to seed/);
  }
  assert.equal(demoSeedRefusal({ optIn: "1", databaseUrl }), null);
  assert.match(demoSeedRefusal({ optIn: "1", databaseUrl: "" }), /DATABASE_URL/);
});

test("refuses any database that isn't on this computer, even with the opt-in", () => {
  for (const databaseUrl of [
    "postgresql://user@db.shared-team.invalid:5432/postgres",
    "postgresql://user@10.0.0.5:5432/app",
    "not a url",
  ]) {
    assert.match(demoSeedRefusal({ optIn: "1", databaseUrl }), /Refusing to seed/);
  }
  for (const databaseUrl of [
    "postgresql://user@localhost:5432/demo",
    "postgresql://user@127.0.0.1:5432/demo",
    "postgresql://user@[::1]:5432/demo",
  ]) {
    assert.equal(demoSeedRefusal({ optIn: "1", databaseUrl }), null);
  }
});

test("describes the target without printing the password", () => {
  assert.equal(
    describeTarget("postgresql://user:hunter2@db.example.invalid:6543/app"),
    "db.example.invalid:6543/app"
  );
});

test("without the opt-in, seed.js exits before any database connection", () => {
  // An opt-in in .env must not count: it has to be given for the command.
  const result = runSeed({
    dotenv: `ALLOW_DEMO_SEED=1\nDATABASE_URL=${UNREACHABLE}\n`,
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /Refusing to seed/);
  assert.doesNotMatch(result.stdout, /Seeding demo data/);
  assert.doesNotMatch(result.stderr, /ECONNREFUSED/);
});

test("the opt-in alone can't seed a remote database picked up from .env", () => {
  // The risky case: opt-in given, but .env still names the shared database.
  const result = runSeed({
    env: { ALLOW_DEMO_SEED: "1" },
    dotenv: "DATABASE_URL=postgresql://user:pw@db.shared-team.invalid:5432/postgres\n",
  });

  assert.equal(result.status, 1);
  assert.match(result.stderr, /not this computer/);
  assert.doesNotMatch(result.stdout, /Seeding demo data/);
});

test("with the opt-in, seed.js gets past the guard and names its target", () => {
  const result = runSeed({
    env: { ALLOW_DEMO_SEED: "1", DATABASE_URL: UNREACHABLE },
  });

  assert.match(result.stdout, /Seeding demo data into 127\.0\.0\.1:9\/no_such_db/);
  assert.doesNotMatch(result.stdout + result.stderr, /not-a-secret/);
  // It then fails to connect, because nothing is listening there.
  assert.notEqual(result.status, 0);
});
