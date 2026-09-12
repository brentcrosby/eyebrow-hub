// Single source of truth for salon business hours.
//
// These values previously lived in three unsynchronised places:
//   - app/api/availability/times/route.ts (slot generation)
//   - components/BusinessHours.tsx        (public display)
//   - app/admin/(panel)/availability/page.tsx (admin editor)
//
// Hours are whole hours in salon local time, keyed by JS getDay() (0 = Sunday).

export type BusinessHoursDay = {
  dayOfWeek: number;
  open: number;
  close: number;
  closed: boolean;
};

export const BUSINESS_HOURS: Record<number, { open: number; close: number }> = {
  0: { open: 11, close: 18 }, // Sun
  1: { open: 10, close: 20 }, // Mon
  2: { open: 10, close: 20 }, // Tue
  3: { open: 10, close: 20 }, // Wed
  4: { open: 10, close: 20 }, // Thu
  5: { open: 10, close: 20 }, // Fri
  6: { open: 10, close: 20 }, // Sat
};

export const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export const SHORT_DAY_NAMES = [
  "Sun",
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
];

/**
 * Hours for a single weekday. A day missing from BUSINESS_HOURS is treated as
 * closed, which matches the previous behaviour of returning no bookable slots.
 */
export function getHoursForDay(dayOfWeek: number): BusinessHoursDay {
  const hours = BUSINESS_HOURS[dayOfWeek];

  if (!hours) {
    return { dayOfWeek, open: 0, close: 0, closed: true };
  }

  return { dayOfWeek, open: hours.open, close: hours.close, closed: false };
}

/** All seven days, Sunday first, for API responses and weekly listings. */
export function getBusinessHoursList(): BusinessHoursDay[] {
  return DAY_NAMES.map((_, dayOfWeek) => getHoursForDay(dayOfWeek));
}

/** Formats a whole hour for display, e.g. 10 -> "10:00 AM", 20 -> "8:00 PM". */
export function formatHourLabel(hour: number): string {
  if (hour === 0) return "12:00 AM";
  if (hour < 12) return `${hour}:00 AM`;
  if (hour === 12) return "12:00 PM";
  return `${hour - 12}:00 PM`;
}

/** Formats a whole hour for an <input type="time">, e.g. 9 -> "09:00". */
export function toTimeInputValue(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}
