// Converts admin form input (a date plus a 24-hour "HH:MM" from
// <input type="time">) into the UTC instant for that Pacific wall-clock time.
//
// The browser's own timezone never takes part: the same Pacific selection
// always gives the same instant. Times that do not exist (spring-forward gap)
// or happen twice (fall-back hour, e.g. 1:30 AM on Nov 1, 2026) return null so
// callers can show an error instead of guessing.
import { parseSalonDateTime } from "@/lib/salonTime";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export function parsePacificTimeInput(date: unknown, time: unknown): Date | null {
  if (typeof date !== "string" || !DATE_PATTERN.test(date)) return null;
  if (typeof time !== "string" || !TIME_PATTERN.test(time)) return null;

  const [hourText, minute] = time.split(":");
  const hour = Number(hourText);

  return parseSalonDateTime(date, `${hour % 12 || 12}:${minute} ${hour < 12 ? "AM" : "PM"}`);
}

export type PacificRangeResult =
  | { ok: true; start: Date; end: Date }
  | { ok: false; error: string };

/** Validates a same-day Pacific start/end pair from an admin form. */
export function parsePacificRange(date: unknown, startTime: unknown, endTime: unknown): PacificRangeResult {
  if (typeof date !== "string" || !DATE_PATTERN.test(date)) {
    return { ok: false, error: "Enter a valid date." };
  }

  const start = parsePacificTimeInput(date, startTime);
  const end = parsePacificTimeInput(date, endTime);

  if (!start || !end) {
    return {
      ok: false,
      error:
        "Enter valid start and end times in Pacific Time. Times that are skipped or repeated by a daylight-saving change (for example 1:30 AM on Nov 1, 2026) cannot be used.",
    };
  }

  if (start >= end) {
    return { ok: false, error: "The end time must be after the start time." };
  }

  return { ok: true, start, end };
}
