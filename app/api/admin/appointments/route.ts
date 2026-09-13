import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { isCancelled } from "@/lib/appointmentStatus";
import { parseDateTimeParams } from "@/lib/dateUtils";
import { requireAdmin } from "@/lib/adminAuth";
import { manualAppointmentSchema } from "@/lib/validations/manualAppointment";
import { MANUAL_SOURCE } from "@/lib/appointmentSource";

// This endpoint is written for the intended camelCase Prisma schema.
// It requires the Appointment table to have startTime/endTime fields
// and the Service relation to be connected correctly.

export async function GET(request: NextRequest) {
  const unauthorized = requireAdmin(request);
  if (unauthorized) return unauthorized;

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

class SchedulingConflictError extends Error {}

// Blocked time always conflicts, regardless of stylist. An appointment only
// conflicts when it's booked with the *same* stylist — a different stylist
// at the same time is not a conflict. When no stylist is assigned, only
// blocked time is checked, since there is no specific resource to double-book.
async function hasSchedulingConflict(
  tx: Prisma.TransactionClient,
  startTime: Date,
  endTime: Date,
  stylistId: number | null
): Promise<boolean> {
  const [blocks, appointments] = await Promise.all([
    tx.availabilityBlock.findMany({
      where: { startTime: { lt: endTime }, endTime: { gt: startTime } },
      select: { id: true },
    }),
    stylistId !== null
      ? tx.appointment.findMany({
          where: {
            stylistId,
            startTime: { lt: endTime },
            endTime: { gt: startTime },
          },
          select: { status: true },
        })
      : Promise.resolve([]),
  ]);

  if (blocks.length > 0) return true;

  return appointments.some((appointment) => !isCancelled(appointment.status));
}

// Staff-entered phone/walk-in appointments.
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
      date,
      time,
      customerName,
      customerPhone,
      customerEmail,
      notes,
      status,
    } = parsed.data;

    // Normalise an omitted field the same as an explicit null — both mean
    // "no stylist assigned".
    const stylistId = parsed.data.stylistId ?? null;

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

    const startTime = parseDateTimeParams(date, time);

    if (!startTime) {
      return NextResponse.json(
        { success: false, errors: { time: "Invalid date or time" } },
        { status: 400 }
      );
    }

    const endTime = new Date(
      startTime.getTime() + service.durationMinutes * 60_000
    );

    // The conflict check and the create happen inside one serializable
    // transaction, so a second, near-simultaneous request for the same
    // stylist and time cannot also pass the check before the first request's
    // row becomes visible.
    const appointment = await db.$transaction(
      async (tx) => {
        const conflict = await hasSchedulingConflict(
          tx,
          startTime,
          endTime,
          stylistId
        );

        if (conflict) {
          throw new SchedulingConflictError();
        }

        return tx.appointment.create({
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
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    return NextResponse.json({ success: true, appointment }, { status: 201 });
  } catch (error) {
    const isConflict =
      error instanceof SchedulingConflictError ||
      (error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2034");

    if (isConflict) {
      return NextResponse.json(
        {
          success: false,
          errors: {
            time: "This stylist is no longer available at that time",
          },
        },
        { status: 409 }
      );
    }

    console.error("Failed to create manual appointment:", error);

    return NextResponse.json(
      { success: false, error: "Failed to create appointment" },
      { status: 500 }
    );
  }
}
