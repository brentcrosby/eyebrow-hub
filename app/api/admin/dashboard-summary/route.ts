import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { PENDING_STATUS, isCancelled } from "@/lib/appointmentStatus";

// One round trip for everything the dashboard shows, rather than four.
//
// Day and week boundaries are supplied by the caller as ISO instants instead of
// being derived here: the server may well run in UTC while the salon does not,
// so "today" has to mean the viewer's today, the same way the schedule view
// builds its own range.
//
// Times are returned as ISO strings and formatted on the client for the same
// reason — formatting here would stamp them in the server's timezone.

const MAX_PENDING_REQUESTS = 10;

function parseInstant(value: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const dayStart = parseInstant(searchParams.get("dayStart"));
    const dayEnd = parseInstant(searchParams.get("dayEnd"));
    const weekStart = parseInstant(searchParams.get("weekStart"));
    const weekEnd = parseInstant(searchParams.get("weekEnd"));

    if (!dayStart || !dayEnd || !weekStart || !weekEnd) {
      return NextResponse.json(
        { error: "dayStart, dayEnd, weekStart and weekEnd are required" },
        { status: 400 }
      );
    }

    const [dayAppointments, dayBlocks, weekAppointments, pendingUpcoming] =
      await Promise.all([
        db.appointment.findMany({
          where: { startTime: { lt: dayEnd }, endTime: { gt: dayStart } },
          include: { service: true },
          orderBy: { startTime: "asc" },
        }),
        db.availabilityBlock.findMany({
          where: { startTime: { lt: dayEnd }, endTime: { gt: dayStart } },
          orderBy: { startTime: "asc" },
        }),
        db.appointment.findMany({
          where: { startTime: { lt: weekEnd }, endTime: { gt: weekStart } },
          select: { status: true },
        }),
        db.appointment.findMany({
          where: { status: PENDING_STATUS, startTime: { gte: dayStart } },
          include: { service: true },
          orderBy: { startTime: "asc" },
        }),
      ]);

    const visibleDayAppointments = dayAppointments.filter(
      (appointment) => !isCancelled(appointment.status)
    );

    const todaysItems = [
      ...visibleDayAppointments.map((appointment) => ({
        kind: "appointment" as const,
        id: appointment.id,
        startTime: appointment.startTime,
        endTime: appointment.endTime,
        title: appointment.service.name,
        subtitle: appointment.customerName,
        status: appointment.status,
      })),
      ...dayBlocks.map((block) => ({
        kind: "block" as const,
        id: block.id,
        startTime: block.startTime,
        endTime: block.endTime,
        title: "Unavailable",
        subtitle: block.reason ?? "Blocked time",
        status: null,
      })),
    ].sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

    return NextResponse.json(
      {
        pendingCount: pendingUpcoming.length,
        todayCount: visibleDayAppointments.length,
        weekCount: weekAppointments.filter(
          (appointment) => !isCancelled(appointment.status)
        ).length,
        cancelledThisWeekCount: weekAppointments.filter((appointment) =>
          isCancelled(appointment.status)
        ).length,
        todaysItems,
        pendingRequests: pendingUpcoming
          .slice(0, MAX_PENDING_REQUESTS)
          .map((appointment) => ({
            id: appointment.id,
            customerName: appointment.customerName,
            serviceName: appointment.service.name,
            startTime: appointment.startTime,
            phone: appointment.customerPhone,
            email: appointment.customerEmail,
          })),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Failed to build dashboard summary:", error);

    return NextResponse.json(
      { error: "Failed to build dashboard summary" },
      { status: 500 }
    );
  }
}
