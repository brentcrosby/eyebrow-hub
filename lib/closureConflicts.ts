// DT-592: appointments that fall inside a salon closure.
//
// Closures never cancel, move or delete appointments. These helpers only read
// them so staff can see which customers need a follow-up. Cancelled and
// rejected appointments are left out; every other status (including any
// unexpected free-text value) is listed so nothing is silently hidden.
import type { Prisma } from "@prisma/client";
import { isInactive } from "@/lib/appointmentStatus";
import { formatSalonDate, formatSalonTime } from "@/lib/salonTime";

export type AffectedAppointment = {
  id: number;
  startTime: string;
  endTime: string;
  /** Pacific date, YYYY-MM-DD. */
  date: string;
  /** Pacific start time, e.g. "10:30 AM". */
  time: string;
  customerName: string;
  service: string | null;
  status: string;
};

type Interval = { startTime: Date; endTime: Date };
type AppointmentClient = Pick<Prisma.TransactionClient, "appointment">;

async function activeAppointmentsBetween(client: AppointmentClient, start: Date, end: Date) {
  const rows = await client.appointment.findMany({
    where: { startTime: { lt: end }, endTime: { gt: start } },
    select: {
      id: true,
      startTime: true,
      endTime: true,
      customerName: true,
      status: true,
      service: { select: { name: true } },
    },
    orderBy: [{ startTime: "asc" }, { id: "asc" }],
  });

  return rows.filter((row) => !isInactive(row.status));
}

type AppointmentRow = Awaited<ReturnType<typeof activeAppointmentsBetween>>[number];

function toAffected(row: AppointmentRow): AffectedAppointment {
  return {
    id: row.id,
    startTime: row.startTime.toISOString(),
    endTime: row.endTime.toISOString(),
    date: formatSalonDate(row.startTime),
    time: formatSalonTime(row.startTime),
    customerName: row.customerName,
    service: row.service?.name ?? null,
    status: row.status,
  };
}

/** Half-open overlap, matching booking enforcement: touching edges do not count. */
export async function findAffectedAppointments(
  client: AppointmentClient,
  start: Date,
  end: Date
): Promise<AffectedAppointment[]> {
  return (await activeAppointmentsBetween(client, start, end)).map(toAffected);
}

/** Adds `affectedAppointments` to each closure using one appointment query. */
export async function withAffectedAppointments<T extends Interval>(
  client: AppointmentClient,
  closures: T[]
): Promise<(T & { affectedAppointments: AffectedAppointment[] })[]> {
  if (closures.length === 0) return [];

  const start = new Date(Math.min(...closures.map((c) => c.startTime.getTime())));
  const end = new Date(Math.max(...closures.map((c) => c.endTime.getTime())));
  const rows = await activeAppointmentsBetween(client, start, end);

  return closures.map((closure) => ({
    ...closure,
    affectedAppointments: rows
      .filter((row) => row.startTime < closure.endTime && row.endTime > closure.startTime)
      .map(toAffected),
  }));
}
