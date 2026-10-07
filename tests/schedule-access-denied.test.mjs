import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as jsxRuntime from "react/jsx-runtime";
import { loadModule } from "./helpers/loadModule.mjs";

const states = loadModule("components/admin/schedule/ScheduleStates.tsx", {
  mocks: {
    react: React,
    "react/jsx-runtime": jsxRuntime,
  },
});

test("schedule responses distinguish permission denial from auth and transient errors", () => {
  const ok = { ok: true, status: 200 };

  assert.equal(states.classifyScheduleResponses([ok, ok, ok]), "authorized");
  assert.equal(
    states.classifyScheduleResponses([ok, { ok: false, status: 403 }, ok]),
    "forbidden"
  );
  assert.equal(
    states.classifyScheduleResponses([ok, { ok: false, status: 401 }, ok]),
    "unauthorized"
  );
  assert.equal(
    states.classifyScheduleResponses([ok, { ok: false, status: 500 }, ok]),
    "error"
  );
});

test("denied schedule state removes loaded customer data and open actions", () => {
  const cleared = states.createClearedScheduleState();

  assert.deepEqual(Array.from(cleared.appointments), []);
  assert.deepEqual(Array.from(cleared.availabilityBlocks), []);
  assert.equal(cleared.selectedAppointmentId, null);
  assert.equal(cleared.bookingRequest, null);
});

test("permission denial renders a clear stable message without retry controls", () => {
  const html = renderToStaticMarkup(
    React.createElement(states.ScheduleAccessDeniedState)
  );

  assert.match(html, /role="alert"/);
  assert.match(html, /do not have permission to view or manage this schedule/i);
  assert.doesNotMatch(html, /Try again/i);
});

test("shared 401 handling redirects once and excludes the login endpoint", async () => {
  const replacements = [];
  const removedKeys = [];
  const browserWindow = {
    fetch: async () => ({ status: 401 }),
    location: {
      replace(url) {
        replacements.push(url);
      },
    },
  };
  const document = { cookie: "adminAccessToken=old" };
  const localStorage = {
    removeItem(key) {
      removedKeys.push(key);
    },
  };
  const session = loadModule("lib/adminSession.ts", {
    globals: {
      window: browserWindow,
      document,
      localStorage,
      Request,
        fetch: async () => ({ status: 200 }),

    },
  });

  session.watchAdminApi();
  session.watchAdminApi();
  await browserWindow.fetch("/api/admin/login");
  assert.deepEqual(replacements, []);

  await browserWindow.fetch("/api/admin/appointments");
  await browserWindow.fetch("/api/admin/availability-blocks");

  assert.deepEqual(replacements, ["/admin/login?expired=1"]);
  assert.deepEqual(removedKeys, ["adminAccessToken"]);
  assert.match(document.cookie, /max-age=0/);
});
