// DT-591: unavailable blocks are saved and shown in Pacific time, whatever
// timezone the staff member's browser (or the server) is in.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { NextResponse } from "next/server.js";
import { loadModule } from "./helpers/loadModule.mjs";
import * as salonTime from "../lib/salonTime.ts";

const pacific = loadModule("lib/pacificTimeInput.ts", {
  mocks: { "@/lib/salonTime": salonTime },
});

const TIMEZONES = ["UTC", "America/Los_Angeles", "Asia/Tokyo"];

function withTimezone(tz, run) {
  const original = process.env.TZ;
  process.env.TZ = tz;
  return Promise.resolve()
    .then(run)
    .finally(() => {
      if (original === undefined) delete process.env.TZ;
      else process.env.TZ = original;
    });
}

function blockFixture() {
  const created = [];
  const deleted = [];
  let saved = [];
  const db = {
    availabilityBlock: {
      findFirst: async () => null,
      findMany: async (args) => {
        db.lastFindMany = args;
        return saved;
      },
      create: async ({ data }) => {
        const row = { id: created.length + 1, ...data };
        created.push(row);
        saved = [...saved, row];
        return row;
      },
      deleteMany: async ({ where }) => {
        deleted.push(where.id);
        const before = saved.length;
        saved = saved.filter((row) => row.id !== where.id);
        return { count: before - saved.length };
      },
    },
  };
  const route = loadModule("app/api/admin/availability-blocks/route.ts", {
    mocks: {
      "next/server": { NextResponse },
      "@/lib/db": { db },
      "@/lib/adminAuth": { requireAdmin: async () => ({ authenticated: true }) },
      "@/lib/pacificTimeInput": pacific,
    },
  });
  const post = (body) => route.POST({ json: async () => body });
  return { db, route, post, created, deleted };
}

test("the same Pacific selection gives the same UTC instant in every timezone", async () => {
  const cases = [
    // Standard time (UTC-8) and daylight time (UTC-7).
    { date: "2026-11-10", time: "09:30", utc: "2026-11-10T17:30:00.000Z" },
    { date: "2026-07-01", time: "09:30", utc: "2026-07-01T16:30:00.000Z" },
    { date: "2026-11-10", time: "23:45", utc: "2026-11-11T07:45:00.000Z" },
  ];
  for (const tz of TIMEZONES) {
    await withTimezone(tz, () => {
      for (const { date, time, utc } of cases) {
        assert.equal(pacific.parsePacificTimeInput(date, time)?.toISOString(), utc, `${tz} ${date} ${time}`);
      }
    });
  }
});

test("creating a block stores the same instants with the server in UTC or Pacific", async () => {
  const stored = [];
  for (const tz of ["UTC", "America/Los_Angeles"]) {
    await withTimezone(tz, async () => {
      const f = blockFixture();
      const response = await f.post({ date: "2026-11-10", startTime: "13:00", endTime: "14:30", reason: " Training " });
      assert.equal(response.status, 201);
      const [row] = f.created;
      stored.push([row.startTime.toISOString(), row.endTime.toISOString()]);
      assert.equal(row.reason, "Training");
    });
  }
  assert.deepEqual(stored[0], ["2026-11-10T21:00:00.000Z", "2026-11-10T22:30:00.000Z"]);
  assert.deepEqual(stored[1], stored[0]);
});

test("ambiguous, skipped and malformed times are rejected with a visible error and nothing is saved", async () => {
  const f = blockFixture();
  const bad = [
    // 1:30 AM happens twice when clocks fall back on Nov 1, 2026.
    { date: "2026-11-01", startTime: "01:30", endTime: "03:00" },
    // 2:30 AM does not exist when clocks spring forward on Mar 8, 2026.
    { date: "2026-03-08", startTime: "02:30", endTime: "04:00" },
    { date: "2026-11-10", startTime: "9:30", endTime: "10:00" },
    { date: "2026-02-30", startTime: "09:00", endTime: "10:00" },
    { date: "2026-11-10", startTime: "10:00", endTime: "10:00" },
    { date: "2026-11-10", startTime: "11:00", endTime: "10:00" },
    // The old browser-local ISO payload is no longer accepted.
    { startTime: "2026-11-10T09:00:00.000Z", endTime: "2026-11-10T10:00:00.000Z" },
  ];
  for (const body of bad) {
    const response = await f.post(body);
    assert.equal(response.status, 400, JSON.stringify(body));
    const { error } = await response.json();
    assert.equal(typeof error, "string");
    assert.ok(error.length > 0);
  }
  const dst = pacific.parsePacificRange("2026-11-01", "01:30", "03:00");
  assert.equal(dst.ok, false);
  assert.match(dst.error, /daylight-saving/);
  assert.equal(f.created.length, 0);
});

test("overlapping blocks still return 409 without saving", async () => {
  const f = blockFixture();
  f.db.availabilityBlock.findFirst = async () => ({ id: 3 });
  const response = await f.post({ date: "2026-11-10", startTime: "13:00", endTime: "14:00" });
  assert.equal(response.status, 409);
  assert.equal(f.created.length, 0);
});

test("existing blocks still list and delete", async () => {
  const f = blockFixture();
  await f.post({ date: "2026-11-10", startTime: "13:00", endTime: "14:00" });
  const range = salonTime.salonDayRange("2026-11-10");
  const list = await f.route.GET({
    url: `http://localhost/api/admin/availability-blocks?start=${range.start.toISOString()}&end=${range.end.toISOString()}`,
  });
  assert.equal(list.status, 200);
  assert.equal((await list.json()).length, 1);
  assert.equal(f.db.lastFindMany.where.startTime.lt.toISOString(), "2026-11-11T08:00:00.000Z");
  assert.equal(f.db.lastFindMany.where.endTime.gt.toISOString(), "2026-11-10T08:00:00.000Z");

  const removed = await f.route.DELETE({ nextUrl: new URL("http://localhost/api/admin/availability-blocks?id=1") });
  assert.equal(removed.status, 204);
  const missing = await f.route.DELETE({ nextUrl: new URL("http://localhost/api/admin/availability-blocks?id=1") });
  assert.equal(missing.status, 404);
});

test("the page sends Pacific input, shows Pacific times and queries whole Pacific days", async () => {
  const page = readFileSync(new URL("../app/admin/(panel)/availability/page.tsx", import.meta.url), "utf8");
  // Browser-local conversions were the bug.
  assert.doesNotMatch(page, /toISOString\(\)\s*,\s*\n?\s*endTime/);
  assert.doesNotMatch(page, /toLocaleTimeString|toLocaleDateString|setHours\(/);
  assert.match(page, /parsePacificRange\(/);
  assert.match(page, /salonDayRange\(closureStart\)/);
  assert.match(page, /date: blockForm\.date/);

  // The display helpers and day range the page relies on ignore the host timezone.
  for (const tz of TIMEZONES) {
    await withTimezone(tz, () => {
      const instant = new Date("2026-11-10T21:00:00.000Z");
      assert.equal(salonTime.formatSalonDate(instant), "2026-11-10");
      assert.equal(salonTime.formatSalonTime(instant), "1:00 PM");
      assert.equal(salonTime.salonDayRange("2026-11-10").start.toISOString(), "2026-11-10T08:00:00.000Z");
    });
  }
});
