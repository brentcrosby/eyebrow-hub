"use client";

import type { BusinessHoursDay } from "@/lib/businessHours";
import { DAY_NAMES, formatHourLabel } from "@/lib/businessHours";
import { formatTimeRange, minutesBetween } from "@/lib/dateUtils";
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

/** Offset and height in CSS calc() terms, clamped to the business-hour window. */
function getBlockGeometry(
  gridStart: Date,
  totalMinutes: number,
  start: Date,
  end: Date
) {
  const rawStart = minutesBetween(gridStart, start);
  const rawEnd = minutesBetween(gridStart, end);

  const startMinute = Math.min(Math.max(rawStart, 0), totalMinutes);
  const endMinute = Math.min(Math.max(rawEnd, 0), totalMinutes);

  return {
    top: `calc(var(--hour-h) * ${startMinute} / 60)`,
    height: `max(calc(var(--hour-h) * ${endMinute - startMinute} / 60), ${MIN_BLOCK_HEIGHT})`,
    // Entirely outside the window once clamped to a zero-length span.
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
              className="h-[var(--hour-h)] border-b border-[#eadfce]"
            />
          ))}

          <div className="absolute inset-0">
            {availabilityBlocks.map((block) => {
              const start = new Date(block.startTime);
              const end = new Date(block.endTime);
              const geometry = getBlockGeometry(
                gridStart,
                totalMinutes,
                start,
                end
              );

              if (!geometry.isVisible) return null;

              return (
                <div
                  key={`block-${block.id}`}
                  style={{ top: geometry.top, height: geometry.height }}
                  className="absolute inset-x-0 overflow-hidden rounded-md bg-gray-200/70 px-2 py-1"
                >
                  <span className="block truncate text-[10px] font-medium text-gray-700 sm:text-xs">
                    Unavailable
                  </span>
                  <span className="block truncate text-[10px] text-gray-600">
                    {block.reason ?? "Blocked time"}
                  </span>
                </div>
              );
            })}

            {appointments.map((appointment) => {
              const start = new Date(appointment.startTime);
              const end = new Date(appointment.endTime);
              const geometry = getBlockGeometry(
                gridStart,
                totalMinutes,
                start,
                end
              );

              if (!geometry.isVisible) return null;

              return (
                <button
                  key={`appointment-${appointment.id}`}
                  type="button"
                  style={{ top: geometry.top, height: geometry.height }}
                  className="absolute inset-x-0 mr-1 overflow-hidden rounded-md border border-[#eadfce] bg-[#f3ebe2] px-2 py-1 text-left hover:bg-[#eadfce]"
                >
                  <span className="block truncate text-[10px] font-medium text-[#5e3d1e] sm:text-xs">
                    {appointment.service.name}
                  </span>
                  <span className="block truncate text-[10px] text-[#7a5a3c]">
                    {formatTimeRange(start, end)}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
