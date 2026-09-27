import type { Prisma } from "@prisma/client";
import { matchesBookingPhone } from "@/lib/bookingAccess";

export const bookingDetailSelect = {
  id: true,
  bookingReference: true,
  customerPhone: true,
  status: true,
  startTime: true,
  endTime: true,
  service: { select: { name: true } },
  stylist: { select: { name: true } },
} satisfies Prisma.AppointmentSelect;

export type BookingDetailRow = Prisma.AppointmentGetPayload<{
  select: typeof bookingDetailSelect;
}>;

export async function findCustomerBooking(
  tx: Prisma.TransactionClient,
  bookingReference: string,
  phone: string
): Promise<BookingDetailRow[] | null> {
  const rows = await tx.appointment.findMany({
    where: { bookingReference },
    select: bookingDetailSelect,
    orderBy: [{ startTime: "asc" }, { id: "asc" }],
  });

  return matchesBookingPhone(rows, phone) ? rows : null;
}

export function bookingSummary(rows: BookingDetailRow[]) {
  return {
    bookingReference: rows[0].bookingReference,
    startTime: rows[0].startTime.toISOString(),
    endTime: new Date(
      Math.max(...rows.map((row) => row.endTime.getTime()))
    ).toISOString(),
    services: rows.map((row) => ({
      name: row.service.name,
      stylistName: row.stylist?.name ?? null,
      startTime: row.startTime.toISOString(),
      endTime: row.endTime.toISOString(),
      status: row.status,
    })),
  };
}
