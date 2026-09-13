import { NextRequest, NextResponse } from "next/server";
import { PENDING_STATUS, isCancelled } from "@/lib/appointmentStatus";
import { requireAdmin } from "@/lib/adminAuth";
import { db } from "@/lib/db";

const appointmentFields = {
  id: true,
  customerName: true,
  customerPhone: true,
  customerEmail: true,
  notes: true,
  startTime: true,
  endTime: true,
  status: true,
  source: true,
  createdAt: true,
  service: {
    select: {
      id: true,
      name: true,
    },
  },
  stylist: {
    select: {
      id: true,
      name: true,
    },
  },
} as const;

type DashboardDayRange = {
  todayStart: Date;
  tomorrowStart: Date;
};

export async function GET(request: NextRequest) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const [dayRange] = await db.$queryRaw<DashboardDayRange[]>`
      SELECT
        date_trunc('day', CURRENT_TIMESTAMP AT TIME ZONE 'America/Los_Angeles')
          AT TIME ZONE 'America/Los_Angeles' AS "todayStart",
        (date_trunc('day', CURRENT_TIMESTAMP AT TIME ZONE 'America/Los_Angeles') + interval '1 day')
          AT TIME ZONE 'America/Los_Angeles' AS "tomorrowStart"
    `;

    if (!dayRange) {
      throw new Error("Dashboard day range was not returned");
    }

    const { todayStart, tomorrowStart } = dayRange;

    const [pendingRequests, todayCandidates] = await Promise.all([
      db.appointment.findMany({
        where: { status: PENDING_STATUS },
        orderBy: [{ createdAt: "asc" }, { id: "asc" }],
        select: appointmentFields,
      }),
      db.appointment.findMany({
        where: {
          startTime: { gte: todayStart, lt: tomorrowStart },
        },
        orderBy: [{ startTime: "asc" }, { id: "asc" }],
        select: appointmentFields,
      }),
    ]);

    const todaysAppointments = todayCandidates.filter(
      (appointment) => !isCancelled(appointment.status)
    );

    return NextResponse.json(
      { pendingRequests, todaysAppointments },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Failed to load dashboard appointments:", error);
    return NextResponse.json(
      { error: "Failed to load dashboard appointments" },
      { status: 500 }
    );
  }
}
