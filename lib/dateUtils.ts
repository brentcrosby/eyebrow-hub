// Shared local-time date helpers.
//
// The app has no date library and these helpers were previously duplicated
// across API routes and components. Everything here works in local time, which
// is what the schedule grid and the availability engine both assume.

const DATE_PARAM_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Local calendar date as YYYY-MM-DD. Not UTC — toISOString() would shift days. */
export function toDateParam(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Parses a YYYY-MM-DD param into local midnight, or null if it is missing or
 * malformed. Rejects rolled-over dates such as "2026-02-31", which the Date
 * constructor would otherwise silently accept as March 3rd.
 */
export function parseDateParam(value: string | null | undefined): Date | null {
  if (!value || !DATE_PARAM_PATTERN.test(value)) {
    return null;
  }

  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);

  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const roundTripped =
    parsed.getFullYear() === year &&
    parsed.getMonth() === month - 1 &&
    parsed.getDate() === day;

  return roundTripped ? parsed : null;
}

const TIME_PARAM_PATTERN = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i;

/**
 * Parses a YYYY-MM-DD date plus a "h:mm AM/PM" time into a local Date, or
 * null if either part is missing, malformed, out of range, or a rolled-over
 * calendar date (delegates the date half to parseDateParam's round-trip check).
 */
export function parseDateTimeParams(
  date: string | null | undefined,
  time: string | null | undefined
): Date | null {
  const result = parseDateParam(date);
  if (!result || !time) return null;

  const match = TIME_PARAM_PATTERN.exec(time.trim());
  if (!match) return null;

  const [, rawHour, rawMinute, period] = match;
  let hour = Number(rawHour);
  const minute = Number(rawMinute);

  if (hour < 1 || hour > 12 || minute > 59) return null;

  if (period.toUpperCase() === "PM" && hour !== 12) hour += 12;
  if (period.toUpperCase() === "AM" && hour === 12) hour = 0;

  result.setHours(hour, minute, 0, 0);
  return result;
}

export function startOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

export function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/** Sunday-first, matching the weekly grid's column order. */
export function startOfWeek(date: Date): Date {
  const result = startOfDay(date);
  result.setDate(result.getDate() - result.getDay());
  return result;
}

export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Whole minutes from `from` to `to`; negative when `to` precedes `from`. */
export function minutesBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 60000);
}

/** Local time of day, e.g. "10:30 AM". */
export function formatTime(date: Date): string {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Local time range, e.g. "10:30 AM - 11:00 AM". */
export function formatTimeRange(start: Date, end: Date): string {
  return `${formatTime(start)} - ${formatTime(end)}`;
}
