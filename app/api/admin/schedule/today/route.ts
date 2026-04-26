import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import type { TodayScheduleResponse } from "@/lib/validations/schedule";

export async function GET(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { db } = await import("@/lib/db");
    const appointments = await db.appointment.findMany({
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
        time: appointment.startTime.toISOString(),
        serviceName: appointment.service.name,
        customerName: appointment.customerName,
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
