import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/adminAuth";
import { salonDayRange } from "@/lib/salonTime";
import { parsePacificTimeInput } from "@/lib/pacificTimeInput";
import { isReservationConflict } from "@/lib/bookingReservation";
import {
  findAffectedAppointments,
  withAffectedAppointments,
} from "@/lib/closureConflicts";

export const dynamic = "force-dynamic";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const MAX_REASON_LENGTH = 120;

class ClosureOverlapError extends Error {}

function validDate(value: string | null): value is string {
  return !!value && DATE_PATTERN.test(value) && salonDayRange(value) !== null;
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authenticated) return auth.response;

  const start = request.nextUrl.searchParams.get("start");
  const end = request.nextUrl.searchParams.get("end");

  if (!validDate(start) || !validDate(end) || start >= end) {
    return NextResponse.json(
      { error: "Valid start and end dates are required." },
      { status: 400 }
    );
  }

  try {
    const closures = await db.closure.findMany({
      where: {
        closureDate: {
          gte: new Date(`${start}T00:00:00.000Z`),
          lt: new Date(`${end}T00:00:00.000Z`),
        },
      },
      orderBy: [{ closureDate: "asc" }, { startTime: "asc" }],
    });

    // Each closure lists the bookings inside it, so staff still see who needs
    // a follow-up after a reload.
    return NextResponse.json(await withAffectedAppointments(db, closures), {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Failed to list salon closures:", error);
    return NextResponse.json(
      { error: "Could not load salon closures." },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (!auth.authenticated) return auth.response;

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "A valid JSON request body is required." },
      { status: 400 }
    );
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "A valid closure request is required." },
      { status: 400 }
    );
  }

  const input = body as {
    date?: unknown;
    fullDay?: unknown;
    startTime?: unknown;
    endTime?: unknown;
    reason?: unknown;
  };

  if (typeof input.date !== "string" || !validDate(input.date)) {
    return NextResponse.json(
      { error: "Enter a valid closure date." },
      { status: 400 }
    );
  }

  if (typeof input.fullDay !== "boolean") {
    return NextResponse.json(
      { error: "Choose whether this is a full-day closure." },
      { status: 400 }
    );
  }

  let startTime: Date | null;
  let endTime: Date | null;

  if (input.fullDay) {
    const range = salonDayRange(input.date);
    startTime = range?.start ?? null;
    endTime = range?.end ?? null;
  } else {
    startTime = parsePacificTimeInput(input.date, input.startTime);
    endTime = parsePacificTimeInput(input.date, input.endTime);
  }

  if (!startTime || !endTime) {
    return NextResponse.json(
      { error: "Enter valid start and end times in Pacific Time." },
      { status: 400 }
    );
  }

  if (startTime >= endTime) {
    return NextResponse.json(
      { error: "The end time must be after the start time." },
      { status: 400 }
    );
  }

  let reason: string | null = null;

  if (input.reason !== undefined && input.reason !== null) {
    if (typeof input.reason !== "string") {
      return NextResponse.json(
        { error: "The reason must be text." },
        { status: 400 }
      );
    }

    reason = input.reason.trim() || null;

    if (reason && reason.length > MAX_REASON_LENGTH) {
      return NextResponse.json(
        { error: `The reason must be ${MAX_REASON_LENGTH} characters or fewer.` },
        { status: 400 }
      );
    }
  }

  const closureDate = new Date(`${input.date}T00:00:00.000Z`);
  const closureStart = startTime;
  const closureEnd = endTime;

  try {
    // Serializable, so two overlapping closures saved at the same moment
    // cannot both pass the overlap check: one is created, the other gets 409.
    // Appointments are only read here, never changed.
    const created = await db.$transaction(
      async (tx) => {
        const overlap = await tx.closure.findFirst({
          where: {
            startTime: { lt: closureEnd },
            endTime: { gt: closureStart },
          },
          select: { id: true },
        });

        if (overlap) throw new ClosureOverlapError();

        const closure = await tx.closure.create({
          data: {
            closureDate,
            startTime: closureStart,
            endTime: closureEnd,
            reason,
          },
        });

        const affectedAppointments = await findAffectedAppointments(
          tx,
          closureStart,
          closureEnd
        );

        return { ...closure, affectedAppointments };
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
    );

    return NextResponse.json(created, { status: 201 });
  } catch (error) {
    if (error instanceof ClosureOverlapError) {
      return NextResponse.json(
        { error: "This closure overlaps an existing closure." },
        { status: 409 }
      );
    }

    // PostgreSQL serialization failure: another closure or booking for this
    // time was saved at the same moment.
    if (isReservationConflict(error)) {
      return NextResponse.json(
        {
          error:
            "Another change to this time was saved at the same moment. Reload the page to see existing closures, then try again.",
        },
        { status: 409 }
      );
    }

    console.error("Failed to create salon closure:", error);
    return NextResponse.json(
      { error: "Could not create the salon closure." },
      { status: 500 }
    );
  }
}
