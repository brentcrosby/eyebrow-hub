import type { Prisma } from "@prisma/client";

type Interval = { startTime: Date; endTime: Date };

/** Half-open intervals: touching an edge does not overlap. */
export function overlapsClosure(closures: Interval[], start: Date, end: Date): boolean {
  return closures.some(({ startTime, endTime }) => startTime < end && endTime > start);
}

export function findBookingClosures(
  client: Pick<Prisma.TransactionClient, "closure">,
  start: Date,
  end: Date
) {
  return client.closure.findMany({
    where: { startTime: { lt: end }, endTime: { gt: start } },
    select: { startTime: true, endTime: true },
  });
}