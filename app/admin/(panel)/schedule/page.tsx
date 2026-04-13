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

const timeLabels = [
  "8:00 AM",
  "9:00 AM",
  "10:00 AM",
  "11:00 AM",
  "12:00 PM",
  "1:00 PM",
  "2:00 PM",
  "3:00 PM",
  "4:00 PM",
  "5:00 PM",
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
      <section className="mx-auto w-full max-w-[1400px]">
        <div className="grid grid-cols-[auto_1fr_auto] items-center gap-4 rounded-lg border border-gray-200 p-4">
          <button
            type="button"
            onClick={handlePreviousWeek}
            className="rounded border border-gray-200 px-3 py-1"
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
            className="rounded border border-gray-200 px-3 py-1"
            aria-label="Next week"
          >
            →
          </button>
        </div>

        <div className="mt-6 grid grid-cols-[minmax(50px,0.6fr)_repeat(7,1fr)] pb-3 text-center text-sm font-medium text-gray-700 sm:text-base">
          <div />
          {weekDays.map((day) => (
            <div key={day} className="min-w-0">
              <span className="block truncate">{day}</span>
            </div>
          ))}
        </div>

        <div className="mt-4 grid grid-cols-[minmax(50px,0.6fr)_repeat(7,1fr)]">
          {timeLabels.map((time, rowIndex) => {
            const isLastRow = rowIndex === timeLabels.length - 1;

            return (
              <div key={time} className="contents">
                <div className="flex h-[clamp(56px,8vh,96px)] items-center justify-center pr-1 text-[10px] text-gray-700 sm:pr-3 sm:text-sm">
                  {time}
                </div>

                {weekDays.map((day) => (
                  <div
                    key={`${day}-${time}`}
                    className={`h-[clamp(56px,8vh,96px)] border-l border-gray-200 ${
                      !isLastRow ? "border-b border-gray-200" : ""
                    } ${day === "Sunday" ? "border-l-0" : ""}`}
                  />
                ))}
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}