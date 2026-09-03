"use client";

import {
  getStatusAccentClasses,
  getStatusBadgeClasses,
  getStatusLabel,
} from "@/lib/appointmentStatus";
import { formatTimeRange } from "@/lib/dateUtils";
import type { AvailabilityBlock, ScheduleAppointment } from "./types";

export type BlockGeometry = {
  top: string;
  height: string;
  left: string;
  width: string;
  /** The item begins before the grid opens, so its top edge is cut off. */
  clippedStart: boolean;
  /** The item ends after the grid closes, so its bottom edge is cut off. */
  clippedEnd: boolean;
};

// Padding on the positioned wrapper rather than the card itself. Because
// box-sizing is border-box, the card's h-full/w-full resolve against the
// wrapper's content box, so this insets the bubble on all four sides without
// disturbing the geometry that positions it.
const GUTTER = "px-[3px] py-[2px]";

// Matches the weekly grid's card treatment: same radius, padding and type
// scale, so the two views read as one component in different layouts.
const CARD_BASE =
  "flex h-full w-full flex-col overflow-hidden rounded-md px-2 py-1 text-[10px] text-gray-700 sm:text-xs";

/** A cut edge is squared off and dashed, so a clipped block reads as continuing. */
function clipClasses(geometry: BlockGeometry) {
  return [
    geometry.clippedStart ? "rounded-t-none [border-top-style:dashed]" : "",
    geometry.clippedEnd ? "rounded-b-none [border-bottom-style:dashed]" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

export function AppointmentBlock({
  appointment,
  start,
  end,
  geometry,
}: {
  appointment: ScheduleAppointment;
  start: Date;
  end: Date;
  geometry: BlockGeometry;
}) {
  const timeRange = formatTimeRange(start, end);
  const statusLabel = getStatusLabel(appointment.status);

  return (
    <div
      className={`absolute z-10 ${GUTTER}`}
      style={{
        top: geometry.top,
        height: geometry.height,
        left: geometry.left,
        width: geometry.width,
      }}
    >
      <button
        type="button"
        // The visual label truncates, so the full description goes here.
        aria-label={`${appointment.service.name}, ${timeRange}, ${statusLabel}, ${appointment.customerName}`}
        className={`${CARD_BASE} border border-l-4 border-gray-200 bg-gray-100 text-left transition-colors hover:bg-gray-200 focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:outline-none ${getStatusAccentClasses(
          appointment.status
        )} ${clipClasses(geometry)}`}
      >
        <span className="flex w-full shrink-0 items-center gap-1">
          <span className="min-w-0 truncate leading-tight font-medium">
            {appointment.service.name}
          </span>
          <span
            className={`shrink-0 rounded-full border px-1 text-[9px] leading-tight font-medium ${getStatusBadgeClasses(
              appointment.status
            )}`}
          >
            {statusLabel}
          </span>
        </span>

        <span className="block shrink-0 truncate leading-tight text-gray-500">
          {timeRange}
        </span>
      </button>
    </div>
  );
}

export function BlockedTimeBlock({
  block,
  start,
  end,
  geometry,
}: {
  block: AvailabilityBlock;
  start: Date;
  end: Date;
  geometry: BlockGeometry;
}) {
  const timeRange = formatTimeRange(start, end);
  const reason = block.reason ?? "Blocked time";

  return (
    <div
      className={`absolute z-0 ${GUTTER}`}
      style={{
        top: geometry.top,
        height: geometry.height,
        left: geometry.left,
        width: geometry.width,
      }}
    >
      <div
        // Hatching and a dashed border keep blocked time a different kind of
        // thing from an appointment card, not just a differently shaded one,
        // while staying within the weekly grid's grey palette.
        className={`${CARD_BASE} border border-l-4 border-dashed border-gray-300 border-l-gray-400 bg-gray-200 ${clipClasses(
          geometry
        )}`}
        style={{
          backgroundImage:
            "repeating-linear-gradient(45deg, rgba(107,114,128,0.00) 0 6px, rgba(107,114,128,0.16) 6px 12px)",
        }}
      >
        <span className="sr-only">{`Blocked time, ${timeRange}, ${reason}`}</span>

        <span
          aria-hidden="true"
          className="block shrink-0 truncate leading-tight font-medium"
        >
          Unavailable
        </span>

        <span
          aria-hidden="true"
          className="block shrink-0 truncate leading-tight text-gray-600"
        >
          {reason}
        </span>
      </div>
    </div>
  );
}
