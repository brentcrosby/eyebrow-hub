import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { toDateParam } from "@/lib/dateUtils";

const DAYS_AHEAD = 60;

export async function GET() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const rangeEnd = new Date(today);
    rangeEnd.setDate(rangeEnd.getDate() + DAYS_AHEAD);

    const blocks = await db.availabilityBlock.findMany({
      where: {
        endTime: { gt: today },
        startTime: { lt: rangeEnd },
      },
      select: { startTime: true, endTime: true },
    });

    const result: { date: string; available: boolean }[] = [];

    for (let i = 0; i < DAYS_AHEAD; i++) {
      const dayStart = new Date(today);
      dayStart.setDate(dayStart.getDate() + i);
      const dayEnd = new Date(dayStart);
      dayEnd.setDate(dayEnd.getDate() + 1);

      const fullDayBlocked = blocks.some(
        (b) => b.startTime <= dayStart && b.endTime >= dayEnd
      );

      result.push({
        date: toDateParam(dayStart),
        available: !fullDayBlocked,
      });
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch available dates:", error);
    return NextResponse.json(
      { error: "Failed to fetch available dates" },
      { status: 500 }
    );
  }
}
