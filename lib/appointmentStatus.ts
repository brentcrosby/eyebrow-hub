// Appointment status helpers.
//
// Appointment.status is a free-text column (Prisma default "pending"), so
// values are normalised before comparison and unknown values fall back to a
// neutral style rather than disappearing from the UI.

export const PENDING_STATUS = "pending";
export const CONFIRMED_STATUS = "confirmed";
export const COMPLETED_STATUS = "completed";
export const CANCELLED_STATUS = "cancelled";

function normalize(status: string | null | undefined): string {
  return (status ?? "").trim().toLowerCase();
}

/** Accepts both the British and American spellings, since the column is free text. */
export function isCancelled(status: string | null | undefined): boolean {
  const value = normalize(status);
  return value === CANCELLED_STATUS || value === "canceled";
}

export function getStatusLabel(status: string | null | undefined): string {
  const value = normalize(status);

  if (!value) return "Unknown";
  if (isCancelled(value)) return "Cancelled";

  return value.charAt(0).toUpperCase() + value.slice(1);
}

const STATUS_BADGE_CLASSES: Record<string, string> = {
  [PENDING_STATUS]: "bg-amber-100 text-amber-800 border-amber-200",
  [CONFIRMED_STATUS]: "bg-green-100 text-green-800 border-green-200",
  [COMPLETED_STATUS]: "bg-gray-100 text-gray-700 border-gray-200",
  [CANCELLED_STATUS]: "bg-red-100 text-red-800 border-red-200",
};

/** Tailwind classes for a status badge; unknown statuses use the admin palette. */
export function getStatusBadgeClasses(
  status: string | null | undefined
): string {
  const value = isCancelled(status) ? CANCELLED_STATUS : normalize(status);

  return (
    STATUS_BADGE_CLASSES[value] ??
    "bg-[#f3ebe2] text-[#7a5a3c] border-[#eadfce]"
  );
}

const STATUS_ACCENT_CLASSES: Record<string, string> = {
  [PENDING_STATUS]: "border-l-amber-400",
  [CONFIRMED_STATUS]: "border-l-green-500",
  [COMPLETED_STATUS]: "border-l-gray-400",
  [CANCELLED_STATUS]: "border-l-red-400",
};

/**
 * Left-edge accent for a schedule card. Carries the same meaning as the badge
 * but survives truncation, so status stays scannable down a column of cards
 * too narrow to show their label.
 */
export function getStatusAccentClasses(
  status: string | null | undefined
): string {
  const value = isCancelled(status) ? CANCELLED_STATUS : normalize(status);

  return STATUS_ACCENT_CLASSES[value] ?? "border-l-gray-300";
}
