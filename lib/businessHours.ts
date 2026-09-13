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

export function formatHourLabel(hour: number): string {
  if (hour === 0) {
    return "12:00 AM";
  }

  if (hour < 12) {
    return `${hour}:00 AM`;
  }

  if (hour === 12) {
    return "12:00 PM";
  }

  return `${hour - 12}:00 PM`;
}

export function toTimeInputValue(hour: number): string {
  return `${String(hour).padStart(2, "0")}:00`;
}