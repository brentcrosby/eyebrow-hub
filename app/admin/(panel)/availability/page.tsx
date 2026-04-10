"use client";

import { useState } from "react";

const sectionCards = [
  {
    title: "Weekly Business Hours",
    description: "Manage the weekly business hours for each day of the week.",
  },
  {
    title: "Block Times",
    description: "View and manage blocked dates and times for the calendar.",
  },
  {
    title: "Scheduling Rules",
    description: "Control notice periods, buffers, and booking rule settings.",
  },
];

const initialBusinessHours = [
  { day: "Sunday", startTime: "09:00", endTime: "18:00", enabled: true },
  { day: "Monday", startTime: "08:00", endTime: "19:00", enabled: true },
  { day: "Tuesday", startTime: "09:00", endTime: "19:00", enabled: true },
  { day: "Wednesday", startTime: "09:00", endTime: "19:00", enabled: true },
  { day: "Thursday", startTime: "09:00", endTime: "19:00", enabled: true },
  { day: "Friday", startTime: "09:00", endTime: "19:00", enabled: true },
  { day: "Saturday", startTime: "09:00", endTime: "18:00", enabled: true },
];

export default function AdminAvailabilityPage() {
  const [businessHours, setBusinessHours] = useState(initialBusinessHours);

  function updateTime(
    day: string,
    field: "startTime" | "endTime",
    value: string
  ) {
    setBusinessHours((currentHours) =>
      currentHours.map((item) =>
        item.day === day ? { ...item, [field]: value } : item
      )
    );
  }

  function toggleDay(day: string) {
    setBusinessHours((currentHours) =>
      currentHours.map((item) =>
        item.day === day ? { ...item, enabled: !item.enabled } : item
      )
    );
  }

  return (
    <main className="min-h-screen bg-[#f5f1eb] p-4 sm:p-6">
      <section className="mx-auto min-h-[calc(100vh-2rem)] w-full max-w-6xl rounded-[28px] bg-white px-5 py-6 shadow-[0_18px_45px_rgba(96,74,50,0.08)] sm:min-h-[calc(100vh-3rem)] sm:px-8 sm:py-8 md:px-10 md:py-10">
        <div>
          <div className="flex flex-col gap-4 border-b border-[#d8c4ae] pb-5 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm uppercase tracking-[0.24em] text-[#b79d84]">
                Admin Availability
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-[#7a5a3c]">
                Availability
              </h1>
            </div>

            <p className="text-sm text-[#7a5a3c]">Welcome, Owner</p>
          </div>

          <div className="mt-8 space-y-6">
            <section className="rounded-3xl border border-[#eadfce] bg-[#fffdf9] p-6">
              <div className="inline-flex rounded-full bg-[#f6e9db] px-4 py-2 text-sm font-semibold text-[#7a5a3c]">
                {sectionCards[0].title}
              </div>

              <div className="mt-4 overflow-hidden rounded-2xl border border-[#eadfce] bg-white">
                {businessHours.map((item) => (
                  <div
                    key={item.day}
                    className="grid gap-4 border-b border-[#efe4d7] px-4 py-4 last:border-b-0 md:grid-cols-[140px_1fr_1fr_auto] md:items-center"
                  >
                    <p className="text-sm font-medium text-[#5e4735]">
                      {item.day}
                    </p>

                    <input
                      type="time"
                      value={item.startTime}
                      onChange={(event) =>
                        updateTime(item.day, "startTime", event.target.value)
                      }
                      className="w-full rounded-full border border-[#dccab5] bg-[#fffaf4] px-4 py-2 text-sm text-[#7a5a3c] outline-none"
                    />

                    <input
                      type="time"
                      value={item.endTime}
                      onChange={(event) =>
                        updateTime(item.day, "endTime", event.target.value)
                      }
                      className="w-full rounded-full border border-[#dccab5] bg-[#fffaf4] px-4 py-2 text-sm text-[#7a5a3c] outline-none"
                    />

                    <button
                      type="button"
                      onClick={() => toggleDay(item.day)}
                      className={`flex h-8 w-14 items-center rounded-full p-1 transition ${
                        item.enabled ? "bg-[#5f8444]" : "bg-[#d7c9bb]"
                      }`}
                      aria-pressed={item.enabled}
                      aria-label={`Toggle ${item.day}`}
                    >
                      <span
                        className={`h-6 w-6 rounded-full bg-white transition ${
                          item.enabled ? "translate-x-6" : "translate-x-0"
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <div className="grid gap-6 lg:grid-cols-2">
              {sectionCards.slice(1).map((card) => (
                <section
                  key={card.title}
                  className="rounded-3xl border border-[#eadfce] bg-[#fffdf9] p-6"
                >
                  <div className="inline-flex rounded-full bg-[#f6e9db] px-4 py-2 text-sm font-semibold text-[#7a5a3c]">
                    {card.title}
                  </div>

                  <div className="mt-4 rounded-2xl border border-dashed border-[#dccab5] bg-white p-6 text-sm text-[#8b735d]">
                    {card.description}
                  </div>
                </section>
              ))}
            </div>
          </div>

        </div>
      </section>
    </main>
  );
}
