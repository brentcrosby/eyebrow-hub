import { Prisma } from "@prisma/client";
import { isInactive } from "@/lib/appointmentStatus";

export class ReservationConflictError extends Error {}

/** Recheck inside the serializable write transaction, not just via HTTP availability. */
export async function assertReservationAvailable(
  tx: Prisma.TransactionClient,
  start: Date,
  end: Date,
  stylistId: number | null
) {
  // Provisional salon-wide capacity: assignment never partitions the resource.
  // Keep the argument stable for callers and a future reviewed per-stylist policy.
  void stylistId;
  const overlap = { startTime: { lt: end }, endTime: { gt: start } };
  const [blocks, appointments] = await Promise.all([
    tx.availabilityBlock.findMany({ where: overlap, select: { id: true } }),
    tx.appointment.findMany({
      where: overlap,
      select: { status: true },
    }),
  ]);
  if (blocks.length || appointments.some((appointment) => !isInactive(appointment.status))) {
    throw new ReservationConflictError();
  }
}

export function isReservationConflict(error: unknown): boolean {
  const cause = error && typeof error === "object" && "cause" in error ? error.cause : null;
  const adapterConflict = cause && typeof cause === "object" &&
    "kind" in cause && cause.kind === "TransactionWriteConflict" &&
    "originalCode" in cause && cause.originalCode === "40001";
  return error instanceof ReservationConflictError ||
    Boolean(adapterConflict) ||
    (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034");
}