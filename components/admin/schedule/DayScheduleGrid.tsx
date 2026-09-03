"use client";

import type { BusinessHoursDay } from "@/lib/businessHours";
import { DAY_NAMES, formatHourLabel } from "@/lib/businessHours";
import { minutesBetween } from "@/lib/dateUtils";
import { layoutScheduleItems } from "@/lib/scheduleLayout";
import type { BlockGeometry } from "./ScheduleItemBlock";
import { AppointmentBlock, BlockedTimeBlock } from "./ScheduleItemBlock";
import type { AvailabilityBlock, ScheduleAppointment } from "./types";

// Row height drives all vertical positioning. Kept as a CSS variable so the
// grid and the item blocks scale together at each breakpoint without JS.
const HOUR_HEIGHT_CLASSES = "[--hour-h:56px] sm:[--hour-h:64px]";

// Floor so a 15-minute service is still tall enough to read.
const MIN_BLOCK_HEIGHT = "22px";

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
  if (hours.closed) {
    return (
      <div className="mt-6 rounded-2xl border border-[#eadfce] bg-[#fffaf4] px-5 py-10 text-center">
        <p className="text-sm text-[#7a5a3c]">
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
              className="flex h-[var(--hour-h)] items-start justify-end pr-2 text-[10px] text-[#a08a75] sm:pr-3 sm:text-xs"
            >
              {formatHourLabel(hour)}
            </div>
          ))}
        </div>

        <div className="relative min-w-0 flex-1 border-l border-[#eadfce]">
          {hourRows.map((hour) => (
            <div
              key={hour}
              aria-hidden="true"
              className="h-[var(--hour-h)] border-b border-[#eadfce]"
            />
          ))}

          <div className="absolute inset-0 pr-1">
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
