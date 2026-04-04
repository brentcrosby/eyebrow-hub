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
  const year = endOfWeek.getFullYear();

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay}–${endDay}`;
  }

  return `${startMonth} ${startDay}–${endMonth} ${endDay}`;
}

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
    <main className="min-h-screen p-6">
      <h1 className="mb-4 text-2xl font-semibold">Schedule</h1>

      <div className="mx-auto flex w-full max-w-4xl items-center justify-between rounded-lg border p-4">
        <button
          type="button"
          onClick={handlePreviousWeek}
          className="justify-self-start rounded border px-3 py-1"
          aria-label="Previous week"
        >
          ←
        </button>

        <h2 className="text-center text-lg font-medium">{currentWeekRange}</h2>

        <button
          type="button"
          onClick={handleNextWeek}
          className="justify-self-end rounded border px-3 py-1"
          aria-label="Next week"
        >
          →
        </button>
      </div>
    </main>
  );
}