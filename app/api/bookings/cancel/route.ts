import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import {
  isBookingAlreadyCancelled,
  isBookingCancellable,
} from "@/lib/bookingAccess";
import { CANCELLED_STATUS } from "@/lib/appointmentStatus";
import { findCustomerBooking } from "@/lib/customerBooking";
import { bookingAccessSchema } from "@/lib/validations/bookingAccess";

class BookingChangedError extends Error {}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const parsed = bookingAccessSchema.safeParse(body);
  const response = (status: number, error: string) =>
    NextResponse.json(
      { success: false, error },
      { status, headers: { "Cache-Control": "no-store" } }
    );

  if (!parsed.success) return response(404, "Booking not found");

  try {
    // Retry serialization failures so simultaneous requests resolve against
    // the committed state rather than performing a second update.
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const outcome = await db.$transaction(
          async (tx) => {
            const bookingReference = parsed.data.bookingReference.toUpperCase();
            const rows = await findCustomerBooking(
              tx,
              bookingReference,
              parsed.data.phone
            );
            if (!rows) return "not-found";
            if (isBookingAlreadyCancelled(rows)) return "already-cancelled";
            if (!isBookingCancellable(rows, new Date())) return "refused";

            // Restrict the write to the exact rows checked above. A changed
            // group or status must roll back the entire transaction.
            const updated = await tx.appointment.updateMany({
              where: {
                bookingReference,
                id: { in: rows.map((row) => row.id) },
                status: { in: rows.map((row) => row.status) },
              },
              data: { status: CANCELLED_STATUS },
            });
            if (updated.count !== rows.length) throw new BookingChangedError();
            const groupSize = await tx.appointment.count({
              where: { bookingReference },
            });
            if (groupSize !== rows.length) throw new BookingChangedError();
            return "cancelled";
          },
          { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
        );

        if (outcome === "not-found") return response(404, "Booking not found");
        if (outcome === "refused")
          return response(409, "Booking cannot be cancelled");
        return NextResponse.json(
          {
            success: true,
            bookingReference: parsed.data.bookingReference.toUpperCase(),
            status: "cancelled",
          },
          { headers: { "Cache-Control": "no-store" } }
        );
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2034" &&
          attempt < 2
        )
          continue;
        if (
          error instanceof BookingChangedError ||
          (error instanceof Prisma.PrismaClientKnownRequestError &&
            error.code === "P2034")
        ) {
          return response(
            409,
            "Booking could not be cancelled; please try again"
          );
        }
        throw error;
      }
    }
  } catch (error) {
    console.error("Failed to cancel booking:", error);
    return response(500, "Could not cancel booking");
  }

  return response(409, "Booking could not be cancelled; please try again");
}
