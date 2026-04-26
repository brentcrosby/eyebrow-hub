import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bookingSelectionSchema } from "@/lib/validations/booking";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);

    const parsed = bookingSelectionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          valid: false,
          errors: parsed.error.flatten().fieldErrors,
        },
        { status: 400 }
      );
    }

    const { serviceIds, stylistId, date, time } = parsed.data;
    const errors: Record<string, string> = {};

    const services = await db.service.findMany({
      where: { id: { in: serviceIds }, active: true },
      select: { id: true, durationMinutes: true },
    });

    if (services.length !== serviceIds.length) {
      errors.serviceIds = "One or more selected services are unavailable";
    }

    if (stylistId !== null) {
      const stylist = await db.stylist.findFirst({
        where: { id: stylistId, active: true },
        select: { id: true },
      });
      if (!stylist) {
        errors.stylistId = "Selected stylist is unavailable";
      }
    }

    const totalDuration = services.reduce((sum, s) => sum + s.durationMinutes, 0);

    const params = new URLSearchParams({ date });
    if (totalDuration > 0) params.set("duration", String(totalDuration));
    const slotsResponse = await fetch(
      `${request.nextUrl.origin}/api/availability/times?${params.toString()}`
    );
    const slots: { time: string; available: boolean }[] = await slotsResponse.json();
    const slot = slots.find((s) => s.time === time);

    if (!slot) {
      errors.time = "Selected time is not a valid slot";
    } else if (!slot.available) {
      errors.time = "Selected time is no longer available";
    }

    if (Object.keys(errors).length > 0) {
      return NextResponse.json({ valid: false, errors }, { status: 409 });
    }

    return NextResponse.json({ valid: true }, { status: 200 });
  } catch (error) {
    console.error("Failed to validate booking:", error);
    return NextResponse.json(
      { error: "Failed to validate booking" },
      { status: 500 }
    );
  }
}
