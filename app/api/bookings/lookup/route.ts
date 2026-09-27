import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bookingAccessSchema } from "@/lib/validations/bookingAccess";
import { bookingSummary, findCustomerBooking } from "@/lib/customerBooking";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = bookingAccessSchema.safeParse(body);
  // Do not distinguish an invalid token or phone from a missing booking.
  const notFound = () =>
    NextResponse.json(
      { success: false, error: "Booking not found" },
      { status: 404, headers: { "Cache-Control": "no-store" } }
    );
  if (!parsed.success) return notFound();

  try {
    const rows = await db.$transaction((tx) =>
      findCustomerBooking(
        tx,
        parsed.data.bookingReference.toUpperCase(),
        parsed.data.phone
      )
    );
    if (!rows) return notFound();

    return NextResponse.json(
      { success: true, booking: bookingSummary(rows) },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (error) {
    console.error("Failed to look up booking:", error);
    return NextResponse.json(
      { success: false, error: "Could not look up booking" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}
