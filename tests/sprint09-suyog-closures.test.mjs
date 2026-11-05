import assert from "node:assert/strict";
import { test } from "node:test";
import React from "react";
import * as jsx from "react/jsx-runtime";
import { renderToStaticMarkup } from "react-dom/server";
import { loadModule } from "./helpers/loadModule.mjs";
import * as dates from "../lib/dateUtils.ts";
import * as salon from "../lib/salonTime.ts";
import * as status from "../lib/appointmentStatus.ts";
import * as hours from "../lib/businessHours.ts";
import * as layout from "../lib/scheduleLayout.ts";
const slots = loadModule("lib/scheduleSlots.ts", {
  mocks: {
    "@/lib/appointmentStatus": status,
    "@/lib/dateUtils": dates,
    "@/lib/salonTime": salon,
  },
});
const closure = {
  id: 7,
  closureDate: "2026-11-01T00:00:00Z",
  startTime: "2026-11-01T07:00:00Z",
  endTime: "2026-11-02T08:00:00Z",
  reason: "Holiday",
};
const options = (date, closures) => ({
  dayStart: dates.parseDateParam(date),
  openHour: 9,
  closeHour: 17,
  intervalMinutes: 30,
  appointments: [],
  blocks: [],
  closures,
});
test("whole Pacific day closure covers the 25-hour DST day in every host timezone", () => {
  const original = process.env.TZ;
  try {
    for (const tz of ["UTC", "America/Los_Angeles", "Asia/Tokyo"]) {
      process.env.TZ = tz;
      assert.equal(
        slots.getOpenSlots(options("2026-11-01", [closure])).length,
        0
      );
      assert.equal(
        slots.getOpenSlots(options("2026-11-02", [closure])).length,
        16
      );
    }
  } finally {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  }
});
test("partial closures exclude every overlapping start and permit exact end boundaries", () => {
  const partial = {
    ...closure,
    startTime: "2026-11-01T18:15:00Z",
    endTime: "2026-11-01T19:00:00Z",
  };
  const times = slots
    .getOpenSlots(options("2026-11-01", [partial]))
    .map((s) => dates.toTimeParam(s.start));
  assert.ok(times.includes("9:30 AM"));
  assert.ok(!times.includes("10:00 AM"));
  assert.ok(!times.includes("10:30 AM"));
  assert.ok(times.includes("11:00 AM"));
});
const blockModule = loadModule(
  "components/admin/schedule/ScheduleItemBlock.tsx",
  {
    mocks: {
      "react/jsx-runtime": jsx,
      "@/lib/appointmentStatus": status,
      "@/lib/dateUtils": dates,
    },
  }
);
const mocks = {
  react: React,
  "react/jsx-runtime": jsx,
  "@/lib/businessHours": hours,
  "@/lib/dateUtils": dates,
  "@/lib/scheduleLayout": layout,
  "@/lib/scheduleSlots": slots,
  "@/lib/appointmentStatus": status,
  "./ScheduleItemBlock": blockModule,
};
const Day = loadModule("components/admin/schedule/DayScheduleGrid.tsx", {
  mocks,
}).default;
const Week = loadModule("components/admin/schedule/WeekScheduleGrid.tsx", {
  mocks,
}).default;
const appointment = {
  id: 22,
  customerName: "Fixture Customer",
  service: { name: "Brow Consult" },
  status: "confirmed",
  startTime: "2026-11-01T18:00:00Z",
  endTime: "2026-11-01T18:30:00Z",
};
const common = {
  appointments: [appointment],
  availabilityBlocks: [{ ...closure, id: 8, reason: "Lunch" }],
  closures: [closure],
  onSlotClick() {},
  onAppointmentClick() {},
};
test("day and week render distinct closures while overlapping appointments remain buttons", () => {
  const date = dates.parseDateParam("2026-11-01");
  for (const element of [
    React.createElement(Day, {
      ...common,
      date,
      hours: { open: 9, close: 17, closed: false },
    }),
    React.createElement(Week, {
      ...common,
      weekStart: date,
      businessHours: [{ dayOfWeek: 0, open: 9, close: 17, closed: false }],
    }),
  ]) {
    const html = renderToStaticMarkup(element);
    assert.match(html, /Salon closure.*Holiday/s);
    assert.match(html, /Unavailable/);
    assert.match(html, /<button[^>]*data-appointment-id="22"/);
    assert.doesNotMatch(html, /data-slot-start=/);
  }
});
test("appointments remain discoverable on a regularly closed day", () => {
  const html = renderToStaticMarkup(
    React.createElement(Day, {
      ...common,
      date: dates.parseDateParam("2026-11-01"),
      hours: { closed: true, open: 0, close: 0 },
    })
  );
  assert.match(html, /data-appointment-id="22"/);
  assert.match(html, /Holiday/);
});
