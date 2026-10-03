// Customer booking access rules. Times are compared as instants, not formatted
// wall-clock strings, so daylight-saving changes do not alter the cutoff.
export const CANCELLATION_NOTICE_MS = 4 * 60 * 60 * 1000;

export type BookingServiceRow = {
  startTime: Date;
  endTime: Date;
  status: string;
  customerPhone: string;
};

export function phoneDigits(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function matchesBookingPhone(
  rows: BookingServiceRow[],
  phone: string
): boolean {
  const digits = phoneDigits(phone);
  return (
    rows.length > 0 &&
    digits.length === 10 &&
    rows.every((row) => phoneDigits(row.customerPhone) === digits)
  );
}

export function isBookingCancellable(
  rows: BookingServiceRow[],
  now: Date
): boolean {
  return (
    rows.length > 0 &&
    rows.every((row) => {
      const status = row.status.trim().toLowerCase();
      return status === "pending" || status === "confirmed";
    }) &&
    Math.min(...rows.map((row) => row.startTime.getTime())) >
      now.getTime() + CANCELLATION_NOTICE_MS
  );
}

export function isBookingAlreadyCancelled(rows: BookingServiceRow[]): boolean {
  return (
    rows.length > 0 &&
    rows.every((row) => {
      const status = row.status.trim().toLowerCase();
      return (
        status === "cancelled" ||
        status === "canceled" ||
        status === "rejected"
      );
    })
  );
}
