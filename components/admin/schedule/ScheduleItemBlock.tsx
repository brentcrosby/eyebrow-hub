"use client";

import { getStatusBadgeClasses, getStatusLabel } from "@/lib/appointmentStatus";
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
      className="absolute z-10"
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
        className={`flex h-full w-full flex-col overflow-hidden rounded-md border border-[#d8c4ae] bg-[#f3ebe2] px-1.5 py-0.5 text-left transition-colors hover:bg-[#eadfce] ${clipClasses(
          geometry
        )}`}
      >
        <span className="flex w-full items-center gap-1">
          <span className="min-w-0 flex-1 truncate text-[10px] font-semibold text-[#5e3d1e] sm:text-xs">
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

        <span className="block truncate text-[9px] text-[#7a5a3c] sm:text-[10px]">
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
      // Hatching, a dashed border and a muted ground make blocked time read as
      // a different kind of thing from an appointment card, not just a
      // differently coloured one.
      className={`absolute z-0 overflow-hidden rounded-md border border-dashed border-[#c2b1a0] bg-[#ece5dd] px-1.5 py-0.5 ${clipClasses(
        geometry
      )}`}
      style={{
        top: geometry.top,
        height: geometry.height,
        left: geometry.left,
        width: geometry.width,
        backgroundImage:
          "repeating-linear-gradient(45deg, rgba(120,95,70,0.00) 0 6px, rgba(120,95,70,0.12) 6px 12px)",
      }}
    >
      <span className="sr-only">{`Blocked time, ${timeRange}, ${reason}`}</span>

      <span aria-hidden="true" className="flex w-full items-center gap-1">
        <span className="min-w-0 flex-1 truncate text-[10px] font-semibold text-[#6b5847] sm:text-xs">
          Unavailable
        </span>
      </span>

      <span
        aria-hidden="true"
        className="block truncate text-[9px] text-[#6b5847] sm:text-[10px]"
      >
        {reason}
      </span>
    </div>
  );
}
