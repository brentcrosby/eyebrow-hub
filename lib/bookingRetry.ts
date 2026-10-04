export function bookingRetryMessage(retryAfter: string | null): string {
  const seconds = Number(retryAfter);
  if (!retryAfter || !Number.isSafeInteger(seconds) || seconds < 1) {
    return "Too many requests. Please try again later.";
  }
  const minutes = Math.ceil(seconds / 60);
  return `Too many requests. Please try again in ${minutes} ${minutes === 1 ? "minute" : "minutes"}.`;
}
