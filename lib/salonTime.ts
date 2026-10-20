// API wall-clock contract: America/Los_Angeles, independent of the host TZ.
// Previously public bookings used offset-free Date strings and manual bookings
// used local Date setters. Stored Prisma timestamps therefore depended on the
// host timezone. Existing rows cannot safely be repaired without provenance.
export const SALON_TIME_ZONE = "America/Los_Angeles";

const formatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: SALON_TIME_ZONE,
  year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", hourCycle: "h23",
});

function parts(date: Date) {
  return Object.fromEntries(formatter.formatToParts(date).map(({ type, value }) => [type, value]));
}

export function formatSalonDate(date: Date): string {
  const p = parts(date);
  return `${p.year}-${p.month}-${p.day}`;
}

export function formatSalonTime(date: Date): string {
  const p = parts(date);
  const hour = Number(p.hour);
  return `${hour % 12 || 12}:${p.minute} ${hour >= 12 ? "PM" : "AM"}`;
}

export function parseSalonDateTime(date: string | null | undefined, time: string | null | undefined): Date | null {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !time) return null;
  const match = /^(\d{1,2}):(\d{2})\s*(AM|PM)$/i.exec(time.trim());
  if (!match) return null;
  const [, rawHour, rawMinute, period] = match;
  const hour = Number(rawHour), minute = Number(rawMinute);
  if (hour < 1 || hour > 12 || minute > 59) return null;
  const wallHour = hour % 12 + (period.toUpperCase() === "PM" ? 12 : 0);
  const wall = `${date}T${String(wallHour).padStart(2, "0")}:${rawMinute}:00.000Z`;
  const nominal = new Date(wall);
  if (!Number.isFinite(nominal.getTime()) || nominal.toISOString() !== wall) return null;
  // Pacific's standard/daylight offsets. Round-trip validation rejects gaps;
  // requiring exactly one match also rejects ambiguous fall-back times.
  const matches = [7, 8].map((offset) => new Date(nominal.getTime() + offset * 3_600_000))
    .filter((candidate) => {
      const p = parts(candidate);
      return formatSalonDate(candidate) === date && Number(p.hour) === wallHour && Number(p.minute) === minute;
    });
  return matches.length === 1 ? matches[0] : null;
}

export function addSalonDays(date: string, days: number): string {
  const result = new Date(`${date}T12:00:00Z`);
  result.setUTCDate(result.getUTCDate() + days);
  return result.toISOString().slice(0, 10);
}

/** Half-open [start, end), including 23/25-hour DST days. */
export function salonDayRange(date: string): { start: Date; end: Date } | null {
  const start = parseSalonDateTime(date, "12:00 AM");
  if (!start) return null;
  const end = parseSalonDateTime(addSalonDays(date, 1), "12:00 AM");
  return end ? { start, end } : null;
}

export function salonWeekday(date: string): number {
  return new Date(`${date}T12:00:00Z`).getUTCDay();
}

/** Business-hour minutes, including 1440 for next midnight. */
export function salonTimeAtMinutes(date: string, minutes: number): Date | null {
  if (!Number.isInteger(minutes) || minutes < 0 || minutes > 1440) return null;
  if (minutes === 1440) return parseSalonDateTime(addSalonDays(date, 1), "12:00 AM");
  const hour = Math.floor(minutes / 60);
  return parseSalonDateTime(date, `${hour % 12 || 12}:${String(minutes % 60).padStart(2, "0")} ${hour >= 12 ? "PM" : "AM"}`);
}