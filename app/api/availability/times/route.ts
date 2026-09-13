import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAvailabilitySettings } from "@/lib/availabilitySettings";
import { CANCELLED_STATUS } from "@/lib/appointmentStatus";

const SLOT_INTERVAL_MINUTES = 30;
const DEFAULT_DURATION_MINUTES = 15;

function formatTime(date: Date): string {
  const hours = date.getHours();
  const minutes = date.getMinutes();
  const period = hours >= 12 ? "PM" : "AM";
  const displayHours =
    hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
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
        {
          error: "date is required (YYYY-MM-DD)",
        },
        {
          status: 400,
        }
      );
    }

    const [year, month, day] = dateParam.split("-").map(Number);

    if (!year || !month || !day) {
      return NextResponse.json(
        {
          error: "Invalid date format, expected YYYY-MM-DD",
        },
        {
          status: 400,
        }
      );
    }

    const duration = durationParam
      ? Number(durationParam)
      : DEFAULT_DURATION_MINUTES;

    if (!Number.isFinite(duration) || duration <= 0) {
      return NextResponse.json(
        {
          error: "duration must be a positive number",
        },
        {
          status: 400,
        }
      );
    }

    const dayStart = new Date(year, month - 1, day, 0, 0, 0, 0);
    const dayEnd = new Date(year, month - 1, day + 1, 0, 0, 0, 0);

    const { businessHours, schedulingRule } =
      await getAvailabilitySettings();

    const hours = businessHours.find(
      (item) => item.dayOfWeek === dayStart.getDay()
    );

    if (!hours?.enabled) {
      return NextResponse.json([], {
        status: 200,
      });
    }

    const now = new Date();

    const bookingCutoff = new Date(
      now.getTime() +
        schedulingRule.minimumNoticeMinutes * 60_000
    );

    const maximumDate = new Date(now);
    maximumDate.setHours(0, 0, 0, 0);
    maximumDate.setDate(
      maximumDate.getDate() +
        schedulingRule.maximumAdvanceDays
    );

    if (dayStart > maximumDate) {
      return NextResponse.json([], {
        status: 200,
      });
    }

    const [blocks, appointments] = await Promise.all([
      db.availabilityBlock.findMany({
        where: {
          startTime: {
            lt: dayEnd,
          },
          endTime: {
            gt: dayStart,
          },
        },
        select: {
          startTime: true,
          endTime: true,
        },
      }),
      db.appointment.findMany({
        where: {
          startTime: {
            lt: dayEnd,
          },
          endTime: {
            gt: dayStart,
          },
          status: {
            not: CANCELLED_STATUS,
          },
        },
        select: {
          startTime: true,
          endTime: true,
        },
      }),
    ]);

    const slots: {
      time: string;
      available: boolean;
    }[] = [];

    const openTime = new Date(
      year,
      month - 1,
      day,
      0,
      hours.openMinutes,
      0,
      0
    );

    const closeTime = new Date(
      year,
      month - 1,
      day,
      0,
      hours.closeMinutes,
      0,
      0
    );

    for (
      let slotStart = new Date(openTime);
      slotStart.getTime() + duration * 60_000 <=
      closeTime.getTime();
      slotStart = new Date(
        slotStart.getTime() +
          SLOT_INTERVAL_MINUTES * 60_000
      )
    ) {
      const slotEnd = new Date(
        slotStart.getTime() + duration * 60_000
      );

      const overlapsBlock = blocks.some(
        (block) =>
          block.startTime < slotEnd &&
          block.endTime > slotStart
      );

      const overlapsAppointment = appointments.some(
        (appointment) => {
          const bufferedStart = new Date(
            appointment.startTime.getTime() -
              schedulingRule.bufferMinutes * 60_000
          );

          const bufferedEnd = new Date(
            appointment.endTime.getTime() +
              schedulingRule.bufferMinutes * 60_000
          );

          return (
            bufferedStart < slotEnd &&
            bufferedEnd > slotStart
          );
        }
      );

      slots.push({
        time: formatTime(slotStart),
        available:
          slotStart >= bookingCutoff &&
          !overlapsBlock &&
          !overlapsAppointment,
      });
    }

    return NextResponse.json(slots, {
      status: 200,
    });
  } catch (error) {
    console.error(
      "Failed to fetch available time slots:",
      error
    );

    return NextResponse.json(
      {
        error: "Failed to fetch available time slots",
      },
      {
        status: 500,
      }
    );
  }
}