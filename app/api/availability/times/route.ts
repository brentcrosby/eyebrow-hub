import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getAvailabilitySettings } from "@/lib/availabilitySettings";
import { CANCELLED_STATUS, REJECTED_STATUS } from "@/lib/appointmentStatus";
import { findBookingClosures, overlapsClosure } from "@/lib/bookingClosures";

const SLOT_INTERVAL_MINUTES = 30;
const DEFAULT_DURATION_MINUTES = 15;

import { addSalonDays, formatSalonDate, formatSalonTime, parseSalonDateTime, salonDayRange, salonTimeAtMinutes, salonWeekday } from "@/lib/salonTime";

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

    const range = salonDayRange(dateParam);

    if (!range) {
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

    const { start: dayStart, end: dayEnd } = range;

    const { businessHours, schedulingRule } =
      await getAvailabilitySettings();

    const hours = businessHours.find(
      (item) => item.dayOfWeek === salonWeekday(dateParam)
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

    const maximumDate = addSalonDays(formatSalonDate(now), schedulingRule.maximumAdvanceDays);

    if (dateParam > maximumDate) {
      return NextResponse.json([], {
        status: 200,
      });
    }

    const [blocks, appointments, closures] = await Promise.all([
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
            notIn: [CANCELLED_STATUS, REJECTED_STATUS, "canceled"],
          },
        },
        select: {
          startTime: true,
          endTime: true,
        },
      }),
      findBookingClosures(db, dayStart, dayEnd),
    ]);

    const slots: {
      time: string;
      available: boolean;
    }[] = [];

    const openTime = salonTimeAtMinutes(dateParam, hours.openMinutes);
    const closeTime = salonTimeAtMinutes(dateParam, hours.closeMinutes);
    if (!openTime || !closeTime) return NextResponse.json([], { status: 200 });

    for (
      let slotStart = new Date(openTime);
      slotStart.getTime() + duration * 60_000 <=
      closeTime.getTime();
      slotStart = new Date(
        slotStart.getTime() +
          SLOT_INTERVAL_MINUTES * 60_000
      )
    ) {
      const time = formatSalonTime(slotStart);
      // Booking rejects ambiguous fall-back labels; do not offer either occurrence.
      if (parseSalonDateTime(dateParam, time)?.getTime() !== slotStart.getTime()) continue;

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
        time,
        available:
          slotStart >= bookingCutoff &&
          !overlapsBlock &&
          !overlapsClosure(closures, slotStart, slotEnd) &&
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