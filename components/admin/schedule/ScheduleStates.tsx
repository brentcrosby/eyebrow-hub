"use client";

// The three states are deliberately different in shape, not just wording: a
// pulsing skeleton, a neutral message, and a red panel with an action. Colour
// alone would not separate empty from error for someone not looking closely.

export function ScheduleLoadingState({ rowCount }: { rowCount: number }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="mt-6 overflow-hidden rounded-2xl border border-[#eadfce] bg-[#fffaf4] p-4"
    >
      <span className="sr-only">Loading schedule…</span>

      <div aria-hidden="true" className="space-y-2">
        {Array.from({ length: Math.min(Math.max(rowCount, 3), 6) }).map(
          (_, index) => (
            <div key={index} className="flex items-center gap-3">
              <div className="h-3 w-12 animate-pulse rounded bg-[#eadfce] sm:w-16" />
              <div
                className="h-10 flex-1 animate-pulse rounded-md bg-[#f3ebe2]"
                style={{ animationDelay: `${index * 120}ms` }}
              />
            </div>
          )
        )}
      </div>
    </div>
  );
}

export function ScheduleEmptyState({ message }: { message: string }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="pointer-events-none absolute inset-0 flex items-center justify-center p-4"
    >
      <p className="rounded-full border border-[#eadfce] bg-[#fffaf4]/95 px-4 py-2 text-center text-sm text-[#7a5a3c]">
        {message}
      </p>
    </div>
  );
}

export function ScheduleErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div
      role="alert"
      className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-5 py-6 text-center"
    >
      <p className="text-sm font-medium text-red-800">{message}</p>

      <button
        type="button"
        onClick={onRetry}
        className="mt-3 rounded-full border border-red-300 bg-white px-4 py-1.5 text-sm font-medium text-red-800 transition-colors hover:bg-red-100"
      >
        Try again
      </button>
    </div>
  );
}
