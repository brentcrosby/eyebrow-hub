import { NextResponse } from "next/server";
import { getAvailabilitySettings } from "@/lib/availabilitySettings";

export async function GET() {
  try {
    const { businessHours } = await getAvailabilitySettings();

    return NextResponse.json(
      businessHours.map((hours) => ({
        dayOfWeek: hours.dayOfWeek,
        open: hours.openMinutes / 60,
        close: hours.closeMinutes / 60,
        closed: !hours.enabled,
      })),
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error("Failed to fetch business hours:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch business hours",
      },
      {
        status: 500,
      }
    );
  }
}
