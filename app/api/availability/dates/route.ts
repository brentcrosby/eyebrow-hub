import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { addSalonDays, formatSalonDate, salonDayRange, salonTimeAtMinutes, salonWeekday } from "@/lib/salonTime";
import { getAvailabilitySettings } from "@/lib/availabilitySettings";

export async function GET() {
  try {
    const todayDate = formatSalonDate(new Date());
    const today = salonDayRange(todayDate)!.start;

    const { businessHours, schedulingRule } =
      await getAvailabilitySettings();

    const daysAhead = schedulingRule.maximumAdvanceDays + 1;

    const firstBookableTime = new Date(
      Date.now() + schedulingRule.minimumNoticeMinutes * 60_000
    );

    const rangeEnd = salonDayRange(addSalonDays(todayDate, daysAhead))!.start;

    const blocks = await db.availabilityBlock.findMany({
      where: {
        endTime: {
          gt: today,
        },
        startTime: {
          lt: rangeEnd,
        },
      },
      select: {
        startTime: true,
        endTime: true,
      },
    });

    const result: {
      date: string;
      available: boolean;
    }[] = [];

    for (let i = 0; i < daysAhead; i++) {
      const date = addSalonDays(todayDate, i);
      const { start: dayStart, end: dayEnd } = salonDayRange(date)!;

      const fullDayBlocked = blocks.some(
        (block) =>
          block.startTime <= dayStart && block.endTime >= dayEnd
      );

      const hours = businessHours.find(
        (item) => item.dayOfWeek === salonWeekday(date)
      );

      const closingTime = salonTimeAtMinutes(date, hours?.closeMinutes ?? 0);

      result.push({
        date,
        available:
          Boolean(hours?.enabled) &&
          closingTime !== null && closingTime > firstBookableTime &&
          !fullDayBlocked,
      });
    }

    return NextResponse.json(result, {
      status: 200,
    });
  } catch (error) {
    console.error("Failed to fetch available dates:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch available dates",
      },
      {
        status: 500,
      }
    );
  }
}