import { NextRequest, NextResponse } from "next/server";
import { PENDING_STATUS, isCancelled } from "@/lib/appointmentStatus";
import { requireAdmin } from "@/lib/adminAuth";
import { db } from "@/lib/db";

type DashboardDateRanges = {
  todayStart: Date;
  tomorrowStart: Date;
  weekStart: Date;
  nextWeekStart: Date;
};

export async function GET(request: NextRequest) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const [dateRanges] = await db.$queryRaw<DashboardDateRanges[]>`
      SELECT
        date_trunc('day', CURRENT_TIMESTAMP AT TIME ZONE 'America/Los_Angeles')
          AT TIME ZONE 'America/Los_Angeles' AS "todayStart",
        (date_trunc('day', CURRENT_TIMESTAMP AT TIME ZONE 'America/Los_Angeles') + interval '1 day')
          AT TIME ZONE 'America/Los_Angeles' AS "tomorrowStart",
        (date_trunc('week', (CURRENT_TIMESTAMP AT TIME ZONE 'America/Los_Angeles') + interval '1 day') - interval '1 day')
          AT TIME ZONE 'America/Los_Angeles' AS "weekStart",
        (date_trunc('week', (CURRENT_TIMESTAMP AT TIME ZONE 'America/Los_Angeles') + interval '1 day') + interval '6 days')
          AT TIME ZONE 'America/Los_Angeles' AS "nextWeekStart"
    `;

    if (!dateRanges) {
      throw new Error("Dashboard date ranges were not returned");
    }

    const { todayStart, tomorrowStart, weekStart, nextWeekStart } = dateRanges;

    const [pendingRequests, todayStatuses, weekStatuses] = await Promise.all([
      db.appointment.count({ where: { status: PENDING_STATUS } }),
      db.appointment.findMany({
        where: {
          startTime: { gte: todayStart, lt: tomorrowStart },
        },
        select: { status: true },
      }),
      db.appointment.findMany({
        where: {
          startTime: { gte: weekStart, lt: nextWeekStart },
        },
        select: { status: true },
      }),
    ]);

    const todaysAppointments = todayStatuses.filter(
      (appointment) => !isCancelled(appointment.status)
    ).length;
    const thisWeeksAppointments = weekStatuses.filter(
      (appointment) => !isCancelled(appointment.status)
    ).length;
    const thisWeeksCancellations = weekStatuses.filter((appointment) =>
      isCancelled(appointment.status)
    ).length;

    return NextResponse.json(
      {
        pendingRequests,
        todaysAppointments,
        thisWeeksAppointments,
        thisWeeksCancellations,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Failed to load dashboard totals:", error);
    return NextResponse.json(
      { error: "Failed to load dashboard totals" },
      { status: 500 }
    );
  }
}
