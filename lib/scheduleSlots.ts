import { isInactive } from "@/lib/appointmentStatus";
import { parseDateTimeParams } from "@/lib/dateUtils";
import { formatSalonDate, formatSalonTime } from "@/lib/salonTime";
import type {
  AvailabilityBlock,
  ScheduleAppointment,
  ScheduleSlot,
} from "@/components/admin/schedule/types";

type GetOpenSlotsOptions = {
  dayStart: Date;
  openHour: number;
  closeHour: number;
  intervalMinutes: number;
  appointments: ScheduleAppointment[];
  blocks: AvailabilityBlock[];
};

type ParsedRange = { start: Date; end: Date };

/**
 * Projects a stored instant onto the salon's wall clock.
 *
 * Schedule layout uses Date as a convenient calendar/clock value. Constructing
 * that value directly from an ISO timestamp makes the grid depend on the
 * browser timezone, though, so an 11 AM Pacific booking can render at 4 AM on
 * a UTC host. This projection keeps comparisons and layout on the salon clock
 * while the API continues to store and exchange real UTC instants.
 */
export function toSalonScheduleDate(value: string | Date): Date | null {
  const instant = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(instant.getTime())) return null;

  return parseDateTimeParams(
    formatSalonDate(instant),
    formatSalonTime(instant)
  );
}

function parseRange(startValue: string, endValue: string): ParsedRange | null {
  const start = toSalonScheduleDate(startValue);
  const end = toSalonScheduleDate(endValue);

  if (!start || !end || start >= end) {
    return null;
  }

  return { start, end };
}

function overlaps(slot: ScheduleSlot, range: ParsedRange) {
  return range.start < slot.end && range.end > slot.start;
}

/** Returns chronological, fully open intervals inside the business-hour window. */
export function getOpenSlots({
  dayStart,
  openHour,
  closeHour,
  intervalMinutes,
  appointments,
  blocks,
}: GetOpenSlotsOptions): ScheduleSlot[] {
  if (
    Number.isNaN(dayStart.getTime()) ||
    !Number.isFinite(openHour) ||
    !Number.isFinite(closeHour) ||
    closeHour <= openHour ||
    !Number.isFinite(intervalMinutes) ||
    intervalMinutes <= 0
  ) {
    return [];
  }

  const open = new Date(dayStart);
  open.setHours(openHour, 0, 0, 0);

  const close = new Date(dayStart);
  close.setHours(closeHour, 0, 0, 0);

  const appointmentRanges = appointments
    .filter((appointment) => !isInactive(appointment.status))
    .map((appointment) =>
      parseRange(appointment.startTime, appointment.endTime)
    )
    .filter((range): range is ParsedRange => range !== null);

  const blockRanges = blocks
    .map((block) => parseRange(block.startTime, block.endTime))
    .filter((range): range is ParsedRange => range !== null);

  const intervalMs = intervalMinutes * 60_000;
  const slots: ScheduleSlot[] = [];

  for (
    let startMs = open.getTime();
    startMs + intervalMs <= close.getTime();
    startMs += intervalMs
  ) {
    const slot = {
      start: new Date(startMs),
      end: new Date(startMs + intervalMs),
    };

    if (
      appointmentRanges.some((range) => overlaps(slot, range)) ||
      blockRanges.some((range) => overlaps(slot, range))
    ) {
      continue;
    }

    slots.push(slot);
  }

  return slots;
}
