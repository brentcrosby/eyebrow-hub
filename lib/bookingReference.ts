import { randomBytes } from "node:crypto";
import type { Prisma } from "@prisma/client";

const MAX_GENERATION_ATTEMPTS = 5;

export function generateBookingReference(): string {
  return randomBytes(8).toString("hex").toUpperCase();
}

export async function createUniqueBookingReference(
  tx: Prisma.TransactionClient,
  generate: () => string = generateBookingReference
): Promise<string> {
  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt += 1) {
    const bookingReference = generate();
    const existingAppointment = await tx.appointment.findFirst({
      where: { bookingReference },
      select: { id: true },
    });

    if (!existingAppointment) return bookingReference;
  }

  throw new Error("Could not generate a unique booking reference");
}
