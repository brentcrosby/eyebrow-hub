import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bookingRequestSchema } from "@/lib/validations/booking";

function parseDateTime(date: string, time: string) {
  const [hhmm, ampm] = time.split(" ");
  const [parsedHour, minute] = hhmm.split(":").map(Number);
  let hour = parsedHour;

  if (ampm === "PM" && hour !== 12) hour += 12;
  if (ampm === "AM" && hour === 12) hour = 0;

  return new Date(
    `${date}T${String(hour).padStart(2, "0")}:${String(minute).padStart(
      2,
      "0"
    )}:00`
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);

    const parsed = bookingRequestSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { serviceIds, stylistId, date, time, name, email, phone, notes } =
      parsed.data;

    const errors: Record<string, string> = {};

    const services = await db.service.findMany({
      where: {
        id: { in: serviceIds },
        active: true,
      },
      select: {
        id: true,
        name: true,
        price: true,
        durationMinutes: true,
      },
    });

    if (services.length !== serviceIds.length) {
      errors.serviceIds = "One or more selected services are unavailable";
    }

    let stylistName: string | null = null;

    if (stylistId !== null) {
      const stylist = await db.stylist.findFirst({
        where: {
          id: stylistId,
          active: true,
        },
        select: {
          id: true,
          name: true,
        },
      });

      if (!stylist) {
        errors.stylistId = "Selected stylist is unavailable";
      } else {
        stylistName = stylist.name;
      }
    }

    const totalDuration = services.reduce(
      (sum, service) => sum + service.durationMinutes,
      0
    );

    const params = new URLSearchParams({ date });

    if (totalDuration > 0) {
      params.set("duration", String(totalDuration));
    }

    const slotsResponse = await fetch(
      `${request.nextUrl.origin}/api/availability/times?${params.toString()}`
    );

    const slots: { time: string; available: boolean }[] =
      await slotsResponse.json();

    const selectedSlot = slots.find((slot) => slot.time === time);

    if (!selectedSlot) {
      errors.time = "Selected time is not a valid slot";
    } else if (!selectedSlot.available) {
      errors.time = "Selected time is no longer available";
    }

    if (Object.keys(errors).length > 0) {
      return NextResponse.json(
        {
          success: false,
          errors,
        },
        { status: 409 }
      );
    }

    let currentStart = parseDateTime(date, time);

    const appointments = [];

    for (const service of services) {
      const startTime = new Date(currentStart);
      const endTime = new Date(
        startTime.getTime() + service.durationMinutes * 60_000
      );

      const appointment = await db.appointment.create({
        data: {
          serviceId: service.id,
          startTime,
          endTime,
          customerName: name.trim(),
          customerEmail: email.trim(),
          customerPhone: phone,
          notes: notes ?? null,
          status: "pending",
        },
      });

      appointments.push(appointment);
      currentStart = endTime;
    }

    const firstAppointment = appointments[0];
    const lastAppointment = appointments[appointments.length - 1];

    const totalPrice = services.reduce(
      (sum, service) => sum + Number(service.price),
      0
    );

    return NextResponse.json(
      {
        success: true,
        booking: {
          id: firstAppointment.id,
          customerName: name.trim(),
          customerEmail: email.trim(),
          customerPhone: phone,
          services: services.map((service) => ({
            id: service.id,
            name: service.name,
            price: Number(service.price),
            durationMinutes: service.durationMinutes,
          })),
          stylistName,
          date,
          time,
          startTime: firstAppointment.startTime.toISOString(),
          endTime: lastAppointment.endTime.toISOString(),
          totalPrice,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create booking:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to create booking",
      },
      { status: 500 }
    );
  }
}
