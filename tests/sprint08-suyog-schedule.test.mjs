import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { loadModule } from "./helpers/loadModule.mjs";
import * as appointmentStatus from "../lib/appointmentStatus.ts";
import * as dateUtils from "../lib/dateUtils.ts";
import * as salonTime from "../lib/salonTime.ts";

const scheduleSlots = loadModule("lib/scheduleSlots.ts", {
  mocks: {
    "@/lib/appointmentStatus": appointmentStatus,
    "@/lib/dateUtils": dateUtils,
    "@/lib/salonTime": salonTime,
  },
});

test("stored instants project to the same Pacific wall time in every host timezone", () => {
  const original = process.env.TZ;

  try {
    for (const timezone of ["UTC", "America/Los_Angeles", "Asia/Tokyo"]) {
      process.env.TZ = timezone;
      const projected = scheduleSlots.toSalonScheduleDate(
        "2026-10-21T18:00:00.000Z"
      );

      assert.ok(projected);
      assert.equal(dateUtils.toDateParam(projected), "2026-10-21");
      assert.equal(dateUtils.toTimeParam(projected), "11:00 AM");
    }
  } finally {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  }
});

test("day slots compare appointments and closures on the salon clock", () => {
  const original = process.env.TZ;

  try {
    process.env.TZ = "UTC";
    const dayStart = dateUtils.parseDateParam("2026-10-21");
    assert.ok(dayStart);

    const slots = scheduleSlots.getOpenSlots({
      dayStart,
      openHour: 11,
      closeHour: 12,
      intervalMinutes: 30,
      appointments: [
        {
          id: 1,
          status: "confirmed",
          startTime: "2026-10-21T18:00:00.000Z",
          endTime: "2026-10-21T18:30:00.000Z",
        },
      ],
      blocks: [
        {
          id: 1,
          startTime: "2026-10-21T18:30:00.000Z",
          endTime: "2026-10-21T19:00:00.000Z",
          reason: "Closed",
        },
      ],
    });

    assert.equal(slots.length, 0);
  } finally {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  }
});

test("schedule queries use Pacific day boundaries instead of host-local midnight", () => {
  const source = readFileSync(
    new URL("../app/admin/(panel)/schedule/page.tsx", import.meta.url),
    "utf8"
  );

  assert.match(source, /salonDayRange\(startDate\)/);
  assert.match(source, /salonDayRange\(endDate\)/);
  assert.doesNotMatch(source, /rangeStart\.toISOString\(\).*addDays/s);
});
