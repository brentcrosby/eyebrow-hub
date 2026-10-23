import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

test("manual booking keeps conflict recovery, reset, and dialog keyboard behavior", () => {
  const booking = readFileSync(
    new URL(
      "../components/admin/schedule/NewAppointmentDialog.tsx",
      import.meta.url
    ),
    "utf8"
  );
  const dialog = readFileSync(
    new URL("../components/admin/schedule/ScheduleDialog.tsx", import.meta.url),
    "utf8"
  );

  assert.match(booking, /response\.status === 409/);
  assert.match(booking, /setTime\(""\)/);
  assert.match(booking, /setAvailabilityRefreshId/);
  assert.match(booking, /request && \(/);
  assert.match(dialog, /onCancel=/);
  assert.match(dialog, /event\.preventDefault\(\)/);
  assert.match(dialog, /onClose\(\)/);
});
