import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { toDateParam } from "@/lib/dateUtils";
import { getAvailabilitySettings } from "@/lib/availabilitySettings";

export async function GET() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { businessHours, schedulingRule } =
      await getAvailabilitySettings();

    const daysAhead = schedulingRule.maximumAdvanceDays + 1;

    const firstBookableTime = new Date(
      Date.now() + schedulingRule.minimumNoticeMinutes * 60_000
    );

    const rangeEnd = new Date(today);
    rangeEnd.setDate(rangeEnd.getDate() + daysAhead);

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
      const dayStart = new Date(today);
      dayStart.setDate(dayStart.getDate() + i);

      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const fullDayBlocked = blocks.some(
        (block) =>
          block.startTime <= dayStart && block.endTime >= dayEnd
      );

      const hours = businessHours.find(
        (item) => item.dayOfWeek === dayStart.getDay()
      );

      const closingTime = new Date(dayStart);
      closingTime.setMinutes(hours?.closeMinutes ?? 0);

      result.push({
        date: toDateParam(dayStart),
        available:
          Boolean(hours?.enabled) &&
          closingTime > firstBookableTime &&
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