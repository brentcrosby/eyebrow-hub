import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isCancelled } from "@/lib/appointmentStatus";
import { requireAdmin } from "@/lib/adminAuth";
import { manualAppointmentSchema } from "@/lib/validations/manualAppointment";
import { MANUAL_SOURCE } from "@/lib/appointmentSource";

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

function parseDateTime(date: string, time: string) {
  const [hhmm, ampm] = time.split(" ");
  const [rawHour, minute] = hhmm.split(":").map(Number);
  let hour = rawHour;

  if (ampm === "PM" && hour !== 12) hour += 12;
  if (ampm === "AM" && hour === 12) hour = 0;

  return new Date(
    `${date}T${String(hour).padStart(2, "0")}:${String(minute).padStart(
      2,
      "0"
    )}:00`
  );
}

// Staff-entered phone/walk-in appointments. Availability/conflict checking
// (DT-464) is deliberately not done here yet — this only validates the
// submitted fields and saves the appointment.
export async function POST(request: NextRequest) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json().catch(() => null);
    const parsed = manualAppointmentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, errors: parsed.error.flatten().fieldErrors },
        { status: 400 }
      );
    }

    const {
      serviceId,
      stylistId,
      date,
      time,
      customerName,
      customerPhone,
      customerEmail,
      notes,
      status,
    } = parsed.data;

    const service = await db.service.findFirst({
      where: { id: serviceId, active: true },
    });

    if (!service) {
      return NextResponse.json(
        {
          success: false,
          errors: { serviceId: "Selected service is unavailable" },
        },
        { status: 400 }
      );
    }

    if (stylistId !== null) {
      const stylist = await db.stylist.findFirst({
        where: { id: stylistId, active: true },
      });

      if (!stylist) {
        return NextResponse.json(
          {
            success: false,
            errors: { stylistId: "Selected stylist is unavailable" },
          },
          { status: 400 }
        );
      }
    }

    const startTime = parseDateTime(date, time);

    if (Number.isNaN(startTime.getTime())) {
      return NextResponse.json(
        { success: false, errors: { time: "Invalid date or time" } },
        { status: 400 }
      );
    }

    const endTime = new Date(
      startTime.getTime() + service.durationMinutes * 60_000
    );

    // A single db.appointment.create() is already atomic — there is no
    // multi-table write here for a failure to leave half-finished.
    const appointment = await db.appointment.create({
      data: {
        serviceId: service.id,
        stylistId,
        startTime,
        endTime,
        customerName: customerName.trim(),
        customerPhone,
        customerEmail: customerEmail?.trim() || null,
        notes: notes?.trim() || null,
        status,
        source: MANUAL_SOURCE,
      },
      include: {
        service: true,
        stylist: true,
      },
    });

    return NextResponse.json({ success: true, appointment }, { status: 201 });
  } catch (error) {
    console.error("Failed to create manual appointment:", error);

    return NextResponse.json(
      { success: false, error: "Failed to create appointment" },
      { status: 500 }
    );
  }
}
