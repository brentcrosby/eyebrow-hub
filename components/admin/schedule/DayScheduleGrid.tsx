"use client";

import { useSyncExternalStore } from "react";
import type { BusinessHoursDay } from "@/lib/businessHours";
import { DAY_NAMES, formatHourLabel } from "@/lib/businessHours";
import { isSameDay, minutesBetween } from "@/lib/dateUtils";
import { layoutScheduleItems } from "@/lib/scheduleLayout";
import type { BlockGeometry } from "./ScheduleItemBlock";
import { AppointmentBlock, BlockedTimeBlock } from "./ScheduleItemBlock";
import type { AvailabilityBlock, ScheduleAppointment } from "./types";

// Row height drives all vertical positioning. Kept as a CSS variable so the
// grid and the item blocks scale together at each breakpoint without JS.
const HOUR_HEIGHT_CLASSES = "[--hour-h:56px] sm:[--hour-h:64px]";

// Floor tall enough for both lines of a card at their natural height, plus
// padding and border. The card's lines are shrink-0, so anything less would
// clip the time range rather than squash it: flex children compress silently,
// which is how the second line ended up 9px tall on short appointments.
const MIN_BLOCK_HEIGHT = "46px";

// A lone appointment stretched across a full-width desktop grid looked absurd
// for two short lines of text, so the lanes column is capped. Overlapping
// items still divide this width between them: at three columns each lane is
// still wide enough for a truncated service name and its time.
const LANES_MAX_WIDTH = "max-w-md";

const MINUTE_MS = 60000;

function subscribeToMinute(onStoreChange: () => void) {
  const id = setInterval(onStoreChange, MINUTE_MS);
  return () => clearInterval(id);
}

/** Truncated to the minute so the value is stable between ticks. */
function getMinuteSnapshot() {
  return Math.floor(Date.now() / MINUTE_MS);
}

/** Null on the server: rendering a clock during SSR would mismatch on hydration. */
function getServerMinuteSnapshot(): number | null {
  return null;
}

type DayScheduleGridProps = {
  date: Date;
  hours: BusinessHoursDay;
  appointments: ScheduleAppointment[];
  availabilityBlocks: AvailabilityBlock[];
};

type Placed<T> = {
  item: T;
  start: Date;
  end: Date;
  geometry: BlockGeometry;
};

/**
 * Vertical offset and height in CSS calc() terms, clamped to the business-hour
 * window. Horizontal placement defaults to full width; overlapping
 * appointments override it once their columns are known.
 */
function getGeometry(
  gridStart: Date,
  totalMinutes: number,
  start: Date,
  end: Date
): BlockGeometry & { isVisible: boolean } {
  const rawStart = minutesBetween(gridStart, start);
  const rawEnd = minutesBetween(gridStart, end);

  const startMinute = Math.min(Math.max(rawStart, 0), totalMinutes);
  const endMinute = Math.min(Math.max(rawEnd, 0), totalMinutes);

  return {
    top: `calc(var(--hour-h) * ${startMinute} / 60)`,
    height: `max(calc(var(--hour-h) * ${endMinute - startMinute} / 60), ${MIN_BLOCK_HEIGHT})`,
    left: "0%",
    width: "100%",
    clippedStart: rawStart < 0,
    clippedEnd: rawEnd > totalMinutes,
    isVisible: endMinute > startMinute,
  };
}

export default function DayScheduleGrid({
  date,
  hours,
  appointments,
  availabilityBlocks,
}: DayScheduleGridProps) {
  // A subscription rather than an effect: this is external state changing on a
  // timer, and it keeps the marker out of the server render entirely.
  const currentMinute = useSyncExternalStore(
    subscribeToMinute,
    getMinuteSnapshot,
    getServerMinuteSnapshot
  );

  if (hours.closed) {
    return (
      <div className="mt-6 rounded-2xl border border-gray-200 bg-white px-5 py-10 text-center">
        <p className="text-sm text-gray-700">
          Closed on {DAY_NAMES[date.getDay()]}.
        </p>
      </div>
    );
  }

  const gridStart = new Date(date);
  gridStart.setHours(hours.open, 0, 0, 0);

  const totalMinutes = (hours.close - hours.open) * 60;

  const hourRows = Array.from(
    { length: hours.close - hours.open },
    (_, index) => hours.open + index
  );

  // Only meaningful while looking at today, and only inside opening hours.
  const now =
    currentMinute === null ? null : new Date(currentMinute * MINUTE_MS);
  const nowOffset =
    now && isSameDay(now, date) ? minutesBetween(gridStart, now) : null;
  const showNowMarker =
    nowOffset !== null && nowOffset >= 0 && nowOffset <= totalMinutes;

  const placedBlocks: Placed<AvailabilityBlock>[] = availabilityBlocks
    .map((block) => {
      const start = new Date(block.startTime);
      const end = new Date(block.endTime);
      return {
        item: block,
        start,
        end,
        geometry: getGeometry(gridStart, totalMinutes, start, end),
      };
    })
    .filter((entry) => entry.geometry.isVisible);

  // Items outside the window are dropped before packing so they cannot claim a
  // column and narrow the appointments that are actually on screen. Columns are
  // computed from real times, not clamped ones, since two appointments overlap
  // regardless of where the grid happens to start.
  const visibleAppointments = appointments
    .map((appointment) => {
      const start = new Date(appointment.startTime);
      const end = new Date(appointment.endTime);
      return {
        item: appointment,
        start,
        end,
        geometry: getGeometry(gridStart, totalMinutes, start, end),
      };
    })
    .filter((entry) => entry.geometry.isVisible);

  const placedAppointments = layoutScheduleItems(visibleAppointments).map(
    (entry) => ({
      ...entry,
      geometry: {
        ...entry.geometry,
        left: `${(entry.column / entry.columnCount) * 100}%`,
        width: `${(1 / entry.columnCount) * 100}%`,
      },
    })
  );

  // Both kinds live in one container sorted by time. Absolute positioning means
  // DOM order does not affect layout, so ordering chronologically gives screen
  // readers the correct reading order without a duplicated summary list, while
  // z-index alone keeps blocked time behind appointments.
  const renderables = [
    ...placedBlocks.map((entry) => ({ kind: "block" as const, entry })),
    ...placedAppointments.map((entry) => ({
      kind: "appointment" as const,
      entry,
    })),
  ].sort((a, b) => a.entry.start.getTime() - b.entry.start.getTime());

  return (
    <div className={`mt-6 ${HOUR_HEIGHT_CLASSES}`}>
      <div className="flex">
        <div className="w-14 shrink-0 sm:w-20">
          {hourRows.map((hour) => (
            <div
              key={hour}
              className="flex h-[var(--hour-h)] items-start justify-end pr-2 text-[10px] text-gray-700 sm:pr-3 sm:text-sm"
            >
              {formatHourLabel(hour)}
            </div>
          ))}
        </div>

        <div
          className={`relative min-w-0 flex-1 border-l border-gray-200 ${LANES_MAX_WIDTH}`}
        >
          {hourRows.map((hour) => (
            <div
              key={hour}
              aria-hidden="true"
              className="h-[var(--hour-h)] border-b border-gray-200"
            >
              {/* Half-hour subdivision: makes a :30 start readable at a glance. */}
              <div className="h-1/2 border-b border-gray-100" />
            </div>
          ))}

          {showNowMarker && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 z-20 flex items-center"
              style={{ top: `calc(var(--hour-h) * ${nowOffset} / 60)` }}
            >
              <span className="-ml-[3px] h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
              <span className="h-px flex-1 bg-red-500/70" />
            </div>
          )}

          <div className="absolute inset-0">
            {renderables.map(({ kind, entry }) =>
              kind === "block" ? (
                <BlockedTimeBlock
                  key={`block-${entry.item.id}`}
                  block={entry.item as AvailabilityBlock}
                  start={entry.start}
                  end={entry.end}
                  geometry={entry.geometry}
                />
              ) : (
                <AppointmentBlock
                  key={`appointment-${entry.item.id}`}
                  appointment={entry.item as ScheduleAppointment}
                  start={entry.start}
                  end={entry.end}
                  geometry={entry.geometry}
                />
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
