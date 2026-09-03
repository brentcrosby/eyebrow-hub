"use client";

import type { BusinessHoursDay } from "@/lib/businessHours";
import { formatHourLabel } from "@/lib/businessHours";
import {
  addDays,
  isSameDay,
  parseDateParam,
  startOfDay,
  startOfWeek,
  toDateParam,
} from "@/lib/dateUtils";
import type { ScheduleView } from "./types";

const buttonClasses =
  "rounded-full border border-[#eadfce] bg-white px-3 py-1.5 text-sm font-medium text-[#7a5a3c] transition-colors hover:bg-[#f6e9db] disabled:cursor-not-allowed disabled:opacity-40";

type ScheduleDayNavProps = {
  selectedDate: Date;
  view: ScheduleView;
  hours: BusinessHoursDay | null;
  onDateChange: (date: Date) => void;
  onViewChange: (view: ScheduleView) => void;
};

function formatWeekRange(date: Date) {
  const weekStart = startOfWeek(date);
  const weekEnd = addDays(weekStart, 6);

  const startMonth = weekStart.toLocaleString("en-US", { month: "long" });
  const endMonth = weekEnd.toLocaleString("en-US", { month: "long" });

  if (startMonth === endMonth) {
    return `${startMonth} ${weekStart.getDate()}–${weekEnd.getDate()}`;
  }

  return `${startMonth} ${weekStart.getDate()}–${endMonth} ${weekEnd.getDate()}`;
}

export default function ScheduleDayNav({
  selectedDate,
  view,
  hours,
  onDateChange,
  onViewChange,
}: ScheduleDayNavProps) {
  const step = view === "week" ? 7 : 1;
  const unit = view === "week" ? "week" : "day";

  const today = startOfDay(new Date());
  const isOnToday =
    view === "week"
      ? isSameDay(startOfWeek(selectedDate), startOfWeek(today))
      : isSameDay(selectedDate, today);

  return (
    <div className="rounded-2xl border border-[#eadfce] bg-[#fffaf4] p-4">
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
        <button
          type="button"
          onClick={() => onDateChange(addDays(selectedDate, -step))}
          className={buttonClasses}
          aria-label={`Previous ${unit}`}
        >
          ←
        </button>

        <div className="min-w-0 text-center">
          <h1 className="truncate text-base font-semibold text-[#5e3d1e] sm:text-xl">
            {view === "week" ? (
              formatWeekRange(selectedDate)
            ) : (
              <>
                <span className="sm:hidden">
                  {selectedDate.toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
                <span className="hidden sm:inline">
                  {selectedDate.toLocaleDateString("en-US", {
                    weekday: "long",
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </span>
              </>
            )}
          </h1>

          {view === "day" && hours && (
            <p className="mt-0.5 truncate text-xs text-[#a08a75]">
              {hours.closed
                ? "Closed"
                : `${formatHourLabel(hours.open)} – ${formatHourLabel(
                    hours.close
                  )}`}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={() => onDateChange(addDays(selectedDate, step))}
          className={buttonClasses}
          aria-label={`Next ${unit}`}
        >
          →
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:justify-between">
        <div className="flex items-center gap-2">
          <label htmlFor="schedule-date" className="sr-only">
            Jump to date
          </label>
          <input
            id="schedule-date"
            type="date"
            value={toDateParam(selectedDate)}
            onChange={(event) => {
              const parsed = parseDateParam(event.target.value);
              if (parsed) onDateChange(parsed);
            }}
            className="rounded-full border border-[#eadfce] bg-white px-3 py-1.5 text-sm text-[#7a5a3c]"
          />

          <button
            type="button"
            onClick={() => onDateChange(today)}
            className={buttonClasses}
            disabled={isOnToday}
          >
            Today
          </button>
        </div>

        <div
          className="flex items-center gap-1 rounded-full border border-[#eadfce] bg-white p-1"
          role="group"
          aria-label="Schedule view"
        >
          {(["day", "week"] as const).map((option) => (
            <button
              key={option}
              type="button"
              onClick={() => onViewChange(option)}
              aria-pressed={view === option}
              className={`rounded-full px-3 py-1 text-sm font-medium capitalize transition-colors ${
                view === option
                  ? "bg-[#7a5a3c] text-white"
                  : "text-[#7a5a3c] hover:bg-[#f6e9db]"
              }`}
            >
              {option}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
