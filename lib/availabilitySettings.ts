import { db } from "@/lib/db";
import type { Prisma } from "@prisma/client";
import { addSalonDays, formatSalonDate, formatSalonTime, parseSalonDateTime, salonTimeAtMinutes, salonWeekday } from "@/lib/salonTime";

export type PersistedBusinessHour = {
  dayOfWeek: number;
  enabled: boolean;
  openMinutes: number;
  closeMinutes: number;
};

export type PersistedSchedulingRule = {
  minimumNoticeMinutes: number;
  maximumAdvanceDays: number;
  bufferMinutes: number;
};

export const DEFAULT_BUSINESS_HOURS: PersistedBusinessHour[] = [
  {
    dayOfWeek: 0,
    enabled: true,
    openMinutes: 660,
    closeMinutes: 1080,
  },
  ...[1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
    dayOfWeek,
    enabled: true,
    openMinutes: 600,
    closeMinutes: 1200,
  })),
];

export const DEFAULT_SCHEDULING_RULE: PersistedSchedulingRule = {
  minimumNoticeMinutes: 120,
  maximumAdvanceDays: 30,
  bufferMinutes: 15,
};

export async function getAvailabilitySettings(client: Pick<Prisma.TransactionClient, "businessHour" | "schedulingRule"> = db) {
  const [savedHours, savedRule] = await Promise.all([
    client.businessHour.findMany({
      orderBy: {
        dayOfWeek: "asc",
      },
    }),
    client.schedulingRule.findUnique({
      where: {
        id: 1,
      },
    }),
  ]);

  const savedByDay = new Map(
    savedHours.map((hours) => [hours.dayOfWeek, hours])
  );

  const businessHours = DEFAULT_BUSINESS_HOURS.map((defaults) => {
    const saved = savedByDay.get(defaults.dayOfWeek);

    return saved
      ? {
          dayOfWeek: saved.dayOfWeek,
          enabled: saved.enabled,
          openMinutes: saved.openMinutes,
          closeMinutes: saved.closeMinutes,
        }
      : defaults;
  });

  const schedulingRule = savedRule
    ? {
        minimumNoticeMinutes: savedRule.minimumNoticeMinutes,
        maximumAdvanceDays: savedRule.maximumAdvanceDays,
        bufferMinutes: savedRule.bufferMinutes,
      }
    : DEFAULT_SCHEDULING_RULE;

  return {
    businessHours,
    schedulingRule,
  };
}

export const SLOT_INTERVAL_MINUTES = 30;
export const DEFAULT_DURATION_MINUTES = 15;
export type AvailabilitySettings = Awaited<ReturnType<typeof getAvailabilitySettings>>;

export function isWithinSchedulingPolicy(start: Date, end: Date, settings: AvailabilitySettings, now = new Date()) {
  const date = formatSalonDate(start);
  const hours = settings.businessHours.find((row) => row.dayOfWeek === salonWeekday(date));
  if (!hours?.enabled || !Number.isFinite(end.getTime()) || end <= start) return false;
  const open = salonTimeAtMinutes(date, hours.openMinutes);
  const close = salonTimeAtMinutes(date, hours.closeMinutes);
  if (!open || !close || start < open || end > close) return false;
  if (parseSalonDateTime(date, formatSalonTime(start))?.getTime() !== start.getTime()) return false;
  if ((start.getTime() - open.getTime()) % (SLOT_INTERVAL_MINUTES * 60_000) !== 0) return false;
  return start.getTime() >= now.getTime() + settings.schedulingRule.minimumNoticeMinutes * 60_000 &&
    date <= addSalonDays(formatSalonDate(now), settings.schedulingRule.maximumAdvanceDays);
}