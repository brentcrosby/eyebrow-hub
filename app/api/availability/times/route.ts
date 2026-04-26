import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

const SLOT_INTERVAL_MINUTES = 30;
const DEFAULT_DURATION_MINUTES = 15;

const BUSINESS_HOURS: Record<number, { open: number; close: number }> = {
  0: { open: 11, close: 18 }, // Sun
  1: { open: 10, close: 20 }, // Mon
  2: { open: 10, close: 20 }, // Tue
  3: { open: 10, close: 20 }, // Wed
  4: { open: 10, close: 20 }, // Thu
  5: { open: 10, close: 20 }, // Fri
  6: { open: 10, close: 20 }, // Sat
};

function formatTime(d: Date): string {
  const hours = d.getHours();
  const minutes = d.getMinutes();
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  const displayMinutes = String(minutes).padStart(2, "0");
  return `${displayHours}:${displayMinutes} ${period}`;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const dateParam = searchParams.get("date");
    const durationParam = searchParams.get("duration");

    if (!dateParam) {
      return NextResponse.json(
        { error: "date is required (YYYY-MM-DD)" },
        { status: 400 }
      );
    }

    const [year, month, day] = dateParam.split("-").map(Number);
    if (!year || !month || !day) {
      return NextResponse.json(
        { error: "Invalid date format, expected YYYY-MM-DD" },
        { status: 400 }
      );
    }

    const duration = durationParam
      ? Number(durationParam)
      : DEFAULT_DURATION_MINUTES;
    if (!Number.isFinite(duration) || duration <= 0) {
      return NextResponse.json(
        { error: "duration must be a positive number" },
        { status: 400 }
      );
    }

    const dayStart = new Date(year, month - 1, day, 0, 0, 0, 0);
    const dayEnd = new Date(year, month - 1, day + 1, 0, 0, 0, 0);
    const dayOfWeek = dayStart.getDay();
    const hours = BUSINESS_HOURS[dayOfWeek];

    if (!hours) {
      return NextResponse.json([], { status: 200 });
    }

    const [blocks, appointments] = await Promise.all([
      db.availabilityBlock.findMany({
        where: {
          startTime: { lt: dayEnd },
          endTime: { gt: dayStart },
        },
        select: { startTime: true, endTime: true },
      }),
      db.appointment.findMany({
        where: {
          startTime: { lt: dayEnd },
          endTime: { gt: dayStart },
          status: { not: "cancelled" },
        },
        select: { startTime: true, endTime: true },
      }),
    ]);

    const slots: { time: string; available: boolean }[] = [];

    const openTime = new Date(year, month - 1, day, hours.open, 0, 0, 0);
    const closeTime = new Date(year, month - 1, day, hours.close, 0, 0, 0);

    for (
      let slotStart = new Date(openTime);
      slotStart.getTime() + duration * 60 * 1000 <= closeTime.getTime();
      slotStart = new Date(slotStart.getTime() + SLOT_INTERVAL_MINUTES * 60 * 1000)
    ) {
      const slotEnd = new Date(slotStart.getTime() + duration * 60 * 1000);

      const overlapsBlock = blocks.some(
        (b) => b.startTime < slotEnd && b.endTime > slotStart
      );
      const overlapsAppointment = appointments.some(
        (a) => a.startTime < slotEnd && a.endTime > slotStart
      );

      slots.push({
        time: formatTime(slotStart),
        available: !overlapsBlock && !overlapsAppointment,
      });
    }

    return NextResponse.json(slots, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch available time slots:", error);
    return NextResponse.json(
      { error: "Failed to fetch available time slots" },
      { status: 500 }
    );
  }
}
