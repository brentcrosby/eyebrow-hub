import { NextRequest, NextResponse } from "next/server";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import type {
  ScheduleAppointment,
  TodayScheduleResponse,
} from "@/lib/validations/schedule";

const SLOT_INTERVAL_MINUTES = 30;

const BUSINESS_HOURS: Record<number, { open: number; close: number }> = {
  0: { open: 11, close: 18 },
  1: { open: 10, close: 20 },
  2: { open: 10, close: 20 },
  3: { open: 10, close: 20 },
  4: { open: 10, close: 20 },
  5: { open: 10, close: 20 },
  6: { open: 10, close: 20 },
};

function formatScheduleTime(date: Date) {
  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function addMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
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

    const businessHours = BUSINESS_HOURS[startOfToday.getDay()];

    if (!businessHours) {
      return NextResponse.json({ appointments: [] }, { status: 200 });
    }

    const [appointments, availabilityBlocks] = await db.$transaction([
      db.appointment.findMany({
        where: {
          startTime: {
            gte: startOfToday,
            lt: startOfTomorrow,
          },
          status: {
            not: "cancelled",
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
      }),
      db.availabilityBlock.findMany({
        where: {
          startTime: {
            lt: startOfTomorrow,
          },
          endTime: {
            gt: startOfToday,
          },
        },
        orderBy: {
          startTime: "asc",
        },
      }),
    ]);

    const scheduleItems: ScheduleAppointment[] = [];
    const firstSlot = new Date(startOfToday);
    firstSlot.setHours(businessHours.open, 0, 0, 0);

    const lastSlotEnd = new Date(startOfToday);
    lastSlotEnd.setHours(businessHours.close, 0, 0, 0);

    for (
      let slotStart = firstSlot;
      slotStart < lastSlotEnd;
      slotStart = addMinutes(slotStart, SLOT_INTERVAL_MINUTES)
    ) {
      const slotEnd = addMinutes(slotStart, SLOT_INTERVAL_MINUTES);
      const blockedSlot = availabilityBlocks.find(
        (block) => block.startTime < slotEnd && block.endTime > slotStart
      );
      const bookedSlot = appointments.find(
        (appointment) =>
          appointment.startTime < slotEnd && appointment.endTime > slotStart
      );

      if (blockedSlot) {
        scheduleItems.push({
          time: formatScheduleTime(slotStart),
          title: "Blocked",
          subtitle: blockedSlot.reason ?? undefined,
          status: "blocked",
        });
        continue;
      }

      if (bookedSlot) {
        scheduleItems.push({
          time: formatScheduleTime(slotStart),
          title: bookedSlot.service.name,
          subtitle: bookedSlot.customerName,
          status: "booked",
        });
        continue;
      }

      scheduleItems.push({
        time: formatScheduleTime(slotStart),
        title: "No Appointment",
        status: "empty",
      });
    }

    const payload: TodayScheduleResponse = {
      appointments: scheduleItems,
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
