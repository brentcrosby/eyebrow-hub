export type ManagedService = {
  name: string;
  stylistName: string | null;
  startTime: string;
  endTime: string;
  status: string;
};

export type ManagedBooking = {
  bookingReference: string;
  startTime: string;
  endTime: string;
  services: ManagedService[];
};

const PACIFIC_TIME = "America/Los_Angeles";
const FOUR_HOURS_MS = 4 * 60 * 60 * 1000;

export function formatPacificDateTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Time unavailable";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: PACIFIC_TIME,
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

export function getCancellationAvailability(
  booking: ManagedBooking,
  now: Date
): "available" | "already-cancelled" | "status" | "cutoff" {
  const statuses = booking.services.map((service) =>
    service.status.trim().toLowerCase()
  );
  if (
    statuses.length > 0 &&
    statuses.every((status) => status === "cancelled" || status === "canceled")
  )
    return "already-cancelled";
  if (
    statuses.length === 0 ||
    !statuses.every((status) => status === "pending" || status === "confirmed")
  )
    return "status";
  const starts = booking.services.map((service) =>
    new Date(service.startTime).getTime()
  );
  if (starts.some((start) => !Number.isFinite(start))) return "status";
  return Math.min(...starts) > now.getTime() + FOUR_HOURS_MS
    ? "available"
    : "cutoff";
}
