import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import * as jsxRuntime from "react/jsx-runtime";
import { loadModule } from "./helpers/loadModule.mjs";

test("Settings no longer shows notification switches that don't save", () => {
  const { default: SettingsPage } = loadModule("app/admin/(panel)/settings/page.tsx", {
    mocks: { react: React, "react/jsx-runtime": jsxRuntime },
  });

  const html = renderToStaticMarkup(React.createElement(SettingsPage));

  assert.match(html, /Email and text notifications are not available yet\./);
  assert.doesNotMatch(html, /type="checkbox"/);
  assert.doesNotMatch(html, /(Phone|Email|Text|Calendar): (On|Off)/);
  // Real account controls are still there.
  assert.match(html, /aria-label="Change email"/);
  assert.match(html, /aria-label="Change password"/);
});

test("Forgot password explains how to get help instead of linking to a missing page", () => {
  // The login form only renders in the browser, so check the page source.
  const source = readFileSync(new URL("../app/admin/login/page.tsx", import.meta.url), "utf8");

  assert.doesNotMatch(source, /\/forgot-password/);
  assert.match(source, /Forgot password\?/);
  assert.match(source, /Contact the salon owner to reset your password\./);
});
