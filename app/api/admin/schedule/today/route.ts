import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import type { TodayScheduleResponse } from "@/lib/validations/schedule";

function formatScheduleTime(date: Date) {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export async function GET(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { db } = await import("@/lib/db");
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfToday.getDate() + 1);

    const appointments = await db.appointment.findMany({
      where: {
        startTime: {
          gte: startOfToday,
          lt: startOfTomorrow,
        },
      },
      include: {
        service: {
          select: {
            name: true,
          },
        },
      },
      orderBy: {
        startTime: "asc",
      },
    });

    const payload: TodayScheduleResponse = {
      appointments: appointments.map((appointment) => ({
        time: formatScheduleTime(appointment.startTime),
        title: appointment.service.name,
        subtitle: appointment.customerName,
        status: "booked",
      })),
    };

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch today's schedule:", error);

    return NextResponse.json(
      { error: "Failed to fetch today's schedule" },
      { status: 500 }
    );
  }
}
