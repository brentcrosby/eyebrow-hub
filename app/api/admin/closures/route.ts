import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/adminAuth";
import { parseSalonDateTime, salonDayRange } from "@/lib/salonTime";

export const dynamic = "force-dynamic";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;
const MAX_REASON_LENGTH = 120;

function validDate(value: string | null): value is string {
  return !!value && DATE_PATTERN.test(value) && salonDayRange(value) !== null;
}

function toPacificTime(date: string, time: string): Date | null {
  if (!TIME_PATTERN.test(time)) return null;

  const [hourText, minute] = time.split(":");
  const hour = Number(hourText);
  const displayHour = hour % 12 || 12;
  const suffix = hour < 12 ? "AM" : "PM";

  return parseSalonDateTime(date, `${displayHour}:${minute} ${suffix}`);
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

    return NextResponse.json(closures, {
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
  } else if (
    typeof input.startTime === "string" &&
    typeof input.endTime === "string"
  ) {
    startTime = toPacificTime(input.date, input.startTime);
    endTime = toPacificTime(input.date, input.endTime);
  } else {
    startTime = null;
    endTime = null;
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

  try {
    const closureDate = new Date(`${input.date}T00:00:00.000Z`);

    const overlap = await db.closure.findFirst({
      where: {
        closureDate,
        startTime: { lt: endTime },
        endTime: { gt: startTime },
      },
      select: { id: true },
    });

    if (overlap) {
      return NextResponse.json(
        { error: "This closure overlaps an existing closure." },
        { status: 409 }
      );
    }

    const closure = await db.closure.create({
      data: { closureDate, startTime, endTime, reason },
    });

    return NextResponse.json(closure, { status: 201 });
  } catch (error) {
    console.error("Failed to create salon closure:", error);
    return NextResponse.json(
      { error: "Could not create the salon closure." },
      { status: 500 }
    );
  }
}