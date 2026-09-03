import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isCancelled } from "@/lib/appointmentStatus";

// This endpoint is written for the intended camelCase Prisma schema.
// It requires the Appointment table to have startTime/endTime fields
// and the Service relation to be connected correctly.

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const start = searchParams.get("start");
    const end = searchParams.get("end");

    if (!start || !end) {
      return NextResponse.json(
        { error: "Start and end dates are required" },
        { status: 400 }
      );
    }

    const startDate = new Date(start);
    const endDate = new Date(end);

    if (Number.isNaN(startDate.getTime()) || Number.isNaN(endDate.getTime())) {
      return NextResponse.json(
        { error: "Invalid start or end date" },
        { status: 400 }
      );
    }

    // Overlap, not containment: an appointment that begins before the window
    // but runs into it belongs on the schedule. Filtering on startTime alone
    // dropped anything straddling the boundary.
    const appointments = await db.appointment.findMany({
      where: {
        startTime: { lt: endDate },
        endTime: { gt: startDate },
      },
      include: {
        service: true,
      },
      orderBy: {
        startTime: "asc",
      },
    });

    // status is a free-text column, so cancelled rows are excluded here rather
    // than in the query: isCancelled normalises case and accepts both
    // spellings, which a SQL equality check would not.
    const visible = appointments.filter(
      (appointment) => !isCancelled(appointment.status)
    );

    return NextResponse.json(visible, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch appointments:", error);

    return NextResponse.json(
      { error: "Failed to fetch appointments" },
      { status: 500 }
    );
  }
}
