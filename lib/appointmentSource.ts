// Appointment source helpers.
//
// Appointment.source is a free-text column (Prisma default "online"), mirroring
// how Appointment.status is handled in lib/appointmentStatus.ts, so values are
// normalised before comparison rather than compared with raw string equality.

export const ONLINE_SOURCE = "online";
export const MANUAL_SOURCE = "manual";

function normalize(source: string | null | undefined): string {
  return (source ?? "").trim().toLowerCase();
}

/** True for staff-entered phone/walk-in bookings; false for the customer booking flow. */
export function isManualSource(source: string | null | undefined): boolean {
  return normalize(source) === MANUAL_SOURCE;
}

export function getSourceLabel(source: string | null | undefined): string {
  return isManualSource(source) ? "Manual" : "Online";
}
