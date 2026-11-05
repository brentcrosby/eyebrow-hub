import { Prisma } from "@prisma/client";
import { isInactive } from "@/lib/appointmentStatus";
import { getAvailabilitySettings, isWithinSchedulingPolicy, type AvailabilitySettings } from "@/lib/availabilitySettings";
import { findBookingClosures, overlapsClosure } from "@/lib/bookingClosures";

export class ReservationConflictError extends Error {}

/** Recheck inside the serializable write transaction, not just via HTTP availability. */
export async function assertReservationAvailable(
  tx: Prisma.TransactionClient,
  start: Date,
  end: Date,
  stylistId: number | null,
  settings?: AvailabilitySettings,
  now = new Date()
) {
  // Provisional salon-wide capacity: assignment never partitions the resource.
  // Keep the argument stable for callers and a future reviewed per-stylist policy.
  void stylistId;
  const policy = settings ?? await getAvailabilitySettings(tx);
  if (!isWithinSchedulingPolicy(start, end, policy, now)) throw new ReservationConflictError();
  const buffer = policy.schedulingRule.bufferMinutes * 60_000;
  const overlap = { startTime: { lt: end }, endTime: { gt: start } };
  const [blocks, appointments, closures] = await Promise.all([
    tx.availabilityBlock.findMany({ where: overlap, select: { id: true } }),
    tx.appointment.findMany({
      where: { startTime: { lt: new Date(end.getTime() + buffer) }, endTime: { gt: new Date(start.getTime() - buffer) } },
      select: { status: true },
    }),
    findBookingClosures(tx, start, end),
  ]);
  if (blocks.length || overlapsClosure(closures, start, end) || appointments.some((appointment) => !isInactive(appointment.status))) {
    throw new ReservationConflictError();
  }
}

export async function getSchedulingIntervals(client: Prisma.TransactionClient, start: Date, end: Date, settings: AvailabilitySettings) {
  const buffer = settings.schedulingRule.bufferMinutes * 60_000;
  const overlap = { startTime: { lt: end }, endTime: { gt: start } };
  const [blocks, closures, appointments] = await Promise.all([
    client.availabilityBlock.findMany({ where: overlap, select: { startTime: true, endTime: true } }),
    findBookingClosures(client, start, end),
    client.appointment.findMany({ where: {
      startTime: { lt: new Date(end.getTime() + buffer) }, endTime: { gt: new Date(start.getTime() - buffer) },
    }, select: { startTime: true, endTime: true, status: true } }),
  ]);
  return [...blocks, ...closures, ...appointments.filter((row) => !isInactive(row.status)).map((row) => ({
    startTime: new Date(row.startTime.getTime() - buffer), endTime: new Date(row.endTime.getTime() + buffer),
  }))];
}

export function isSchedulingSlotAvailable(start: Date, end: Date, settings: AvailabilitySettings, intervals: { startTime: Date; endTime: Date }[], now = new Date()) {
  return isWithinSchedulingPolicy(start, end, settings, now) && !intervals.some((row) => row.startTime < end && row.endTime > start);
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