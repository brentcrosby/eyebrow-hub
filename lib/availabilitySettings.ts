import { db } from "@/lib/db";

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

export async function getAvailabilitySettings() {
  const [savedHours, savedRule] = await Promise.all([
    db.businessHour.findMany({
      orderBy: {
        dayOfWeek: "asc",
      },
    }),
    db.schedulingRule.findUnique({
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
