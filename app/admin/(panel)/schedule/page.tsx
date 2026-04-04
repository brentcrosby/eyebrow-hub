"use client";

import { useState } from "react";

function getWeekRange(date: Date) {
  const dayOfWeek = date.getDay();

  const startOfWeek = new Date(date);
  startOfWeek.setDate(date.getDate() - dayOfWeek);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);

  const startMonth = startOfWeek.toLocaleString("en-US", { month: "long" });
  const endMonth = endOfWeek.toLocaleString("en-US", { month: "long" });

  const startDay = startOfWeek.getDate();
  const endDay = endOfWeek.getDate();

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay}–${endDay}`;
  }

  return `${startMonth} ${startDay}–${endMonth} ${endDay}`;
}

const weekDays = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export default function AdminSchedulePage() {
  const [currentDate, setCurrentDate] = useState(new Date());

  const currentWeekRange = getWeekRange(currentDate);

  function handlePreviousWeek() {
    const previousWeek = new Date(currentDate);
    previousWeek.setDate(currentDate.getDate() - 7);
    setCurrentDate(previousWeek);
  }

  function handleNextWeek() {
    const nextWeek = new Date(currentDate);
    nextWeek.setDate(currentDate.getDate() + 7);
    setCurrentDate(nextWeek);
  }

  return (
    <main className="min-h-screen p-4 sm:p-6">
      <section className="mx-auto w-full max-w-6xl">
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-lg border p-4">
          <button
            type="button"
            onClick={handlePreviousWeek}
            className="rounded border px-3 py-1"
            aria-label="Previous week"
          >
            ←
          </button>

          <h2 className="text-center text-lg font-medium sm:text-xl">
            {currentWeekRange}
          </h2>

          <button
            type="button"
            onClick={handleNextWeek}
            className="rounded border px-3 py-1"
            aria-label="Next week"
          >
            →
          </button>
        </div>

        <div className="mt-6 grid grid-cols-7 gap-2 border-b pb-3 text-center text-sm font-medium sm:text-base">
          {weekDays.map((day) => (
            <div key={day} className="min-w-0">
              <span className="block truncate">{day}</span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}