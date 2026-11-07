// DT-593: public business hours behave on a production build and when the
// database is empty or unreachable; settings are never cached.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import * as jsx from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import { NextResponse } from "next/server.js";
import { loadModule } from "./helpers/loadModule.mjs";
import * as salonTime from "../lib/salonTime.ts";
import * as hours from "../lib/businessHours.ts";

const policy = loadModule("lib/availabilitySettings.ts", {
  mocks: { "@/lib/db": { db: {} }, "@/lib/salonTime": salonTime },
});

const row = (dayOfWeek, enabled, openMinutes, closeMinutes) => ({ dayOfWeek, enabled, openMinutes, closeMinutes });
const WEEK = [
  row(0, false, 600, 1020),
  ...[1, 2, 3, 4, 5].map((day) => row(day, true, 570, 1050)),
  row(6, true, 600, 960),
];

function loadComponent(findMany) {
  const db = { businessHour: { findMany } };
  const loaded = loadModule("components/BusinessHours.tsx", {
    mocks: {
      "react/jsx-runtime": jsx,
      "@/lib/db": { db },
      "@/lib/businessHours": hours,
      "@/lib/availabilitySettings": policy,
    },
  });
  return { component: loaded, render: async () => renderToStaticMarkup(await loaded.default()) };
}

async function quietly(run) {
  const original = console.error;
  console.error = () => {};
  try {
    return await run();
  } finally {
    console.error = original;
  }
}

test("saved hours are shown Monday-first, with closed days marked", async () => {
  const { render } = loadComponent(async () => WEEK);
  const html = await render();
  assert.match(html, /Monday<\/span><span>9:30 am - 5:30 pm/);
  assert.match(html, /Saturday<\/span><span>10:00 am - 4:00 pm/);
  assert.match(html, /Sunday<\/span><span>Closed/);
  assert.ok(html.indexOf("Monday") < html.indexOf("Sunday"));
  assert.doesNotMatch(html, /data-business-hours-fallback/);
});

test("hours are read on every render, so admin changes show after a reload", async () => {
  let saved = WEEK;
  const { render } = loadComponent(async () => saved);
  assert.match(await render(), /Monday<\/span><span>9:30 am - 5:30 pm/);
  saved = WEEK.map((day) => (day.dayOfWeek === 1 ? row(1, true, 660, 1140) : day));
  assert.match(await render(), /Monday<\/span><span>11:00 am - 7:00 pm/);

  const home = readFileSync(new URL("../app/page.tsx", import.meta.url), "utf8");
  assert.match(home, /export const dynamic = "force-dynamic"/);
});

test("an empty database shows a customer message, not demo hours or a blank section", async () => {
  const { component, render } = loadComponent(async () => []);
  assert.deepEqual({ ...(await component.loadPublicBusinessHours()) }, { status: "unpublished" });
  const html = await render();
  assert.match(html, /Business Hours/);
  assert.match(html, /data-business-hours-fallback="unpublished"/);
  assert.match(html, /will be posted here soon/);
  // The demo defaults (10:00 am - 8:00 pm) must not appear as real hours.
  assert.doesNotMatch(html, /8:00 pm/);
});

test("a database outage shows a customer message instead of crashing", async () => {
  const { render } = loadComponent(async () => {
    throw new Error("connect ECONNREFUSED");
  });
  const html = await quietly(render);
  assert.match(html, /data-business-hours-fallback="unavailable"/);
  assert.match(html, /can&#x27;t show our business hours right now/);
});

test("a partly saved week fills missing days with the booking defaults", async () => {
  const { component } = loadComponent(async () => [row(1, true, 540, 1020)]);
  const result = await component.loadPublicBusinessHours();
  assert.equal(result.status, "ok");
  assert.deepEqual([...result.days.map((d) => d.hours).slice(0, 2)], ["9:00 am - 5:00 pm", "10:00 am - 8:00 pm"]);
  assert.equal(result.days[6].hours, "11:00 am - 6:00 pm");
});

function settingsRoute(db) {
  const getAvailabilitySettings = () => policy.getAvailabilitySettings(db);
  return loadModule("app/api/admin/availability-settings/route.ts", {
    mocks: {
      "next/server": { NextResponse },
      "@/lib/db": { db },
      "@/lib/adminAuth": { requireAdmin: async () => ({ authenticated: true }) },
      "@/lib/availabilitySettings": { getAvailabilitySettings },
      "@/lib/validations/availabilitySettings": {
        availabilitySettingsSchema: { safeParse: (data) => ({ success: true, data }) },
      },
    },
  });
}

test("saved settings persist across a restart and are never cached", async () => {
  // The database outlives the app: a fresh route module is a restarted server.
  const store = { hours: new Map(), rule: null };
  const db = {
    businessHour: {
      findMany: async () => [...store.hours.values()].sort((a, b) => a.dayOfWeek - b.dayOfWeek),
      upsert: async ({ where, create, update }) => {
        store.hours.set(where.dayOfWeek, { ...(store.hours.get(where.dayOfWeek) ?? create), ...update });
      },
    },
    schedulingRule: {
      findUnique: async () => store.rule,
      upsert: async ({ create, update }) => { store.rule = { ...(store.rule ?? create), ...update }; },
    },
    $transaction: async (operations) => Promise.all(operations),
  };
  const schedulingRule = { minimumNoticeMinutes: 60, maximumAdvanceDays: 45, bufferMinutes: 10 };

  const saved = await settingsRoute(db).PUT({ json: async () => ({ businessHours: WEEK, schedulingRule }) });
  assert.equal(saved.status, 200);
  assert.equal(saved.headers.get("cache-control"), "no-store");

  const restarted = await settingsRoute(db).GET({});
  assert.equal(restarted.headers.get("cache-control"), "no-store");
  const body = await restarted.json();
  assert.deepEqual(body.businessHours, WEEK);
  assert.deepEqual(body.schedulingRule, schedulingRule);

  const source = readFileSync(new URL("../app/api/admin/availability-settings/route.ts", import.meta.url), "utf8");
  assert.match(source, /export const dynamic = "force-dynamic"/);
});

test("the production-data checklist lists unconfirmed values and forbids demo seeds", () => {
  const doc = readFileSync(new URL("../docs/DT-593-production-data-checklist.md", import.meta.url), "utf8");
  for (const topic of ["hours", "prices", "Stylist roster", "Address", "Phone", "Cancellation policy"]) {
    assert.match(doc, new RegExp(topic, "i"), topic);
  }
  assert.ok((doc.match(/\| UNCONFIRMED \|/g) ?? []).length >= 8);
  assert.match(doc, /Never run `npm run seed`/);
  assert.match(doc, /clearly labelled, disposable test data/);
});
