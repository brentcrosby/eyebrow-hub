"use client";

import { useEffect, useState } from "react";
import { addDays, startOfWeek } from "@/lib/dateUtils";
import WeekScheduleGrid from "@/components/admin/schedule/WeekScheduleGrid";
import {
  getMockAppointments,
  getMockAvailabilityBlocks,
} from "@/components/admin/schedule/mockData";
import type {
  AvailabilityBlock,
  ScheduleAppointment,
} from "@/components/admin/schedule/types";

// TEMPORARY TEST FLAG:
// Keep this true while the database has no availability block records.
// Change this to false once real availability blocks exist in the database.
const USE_MOCK_AVAILABILITY_BLOCKS = true;

function getWeekRange(date: Date) {
  const weekStart = startOfWeek(date);
  const weekEnd = addDays(weekStart, 6);

  const startMonth = weekStart.toLocaleString("en-US", { month: "long" });
  const endMonth = weekEnd.toLocaleString("en-US", { month: "long" });

  const startDay = weekStart.getDate();
  const endDay = weekEnd.getDate();

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay}–${endDay}`;
  }

  return `${startMonth} ${startDay}–${endMonth} ${endDay}`;
}

export default function AdminSchedulePage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState<ScheduleAppointment[]>([]);
  const [availabilityBlocks, setAvailabilityBlocks] = useState<
    AvailabilityBlock[]
  >([]);
  const [appointmentsError, setAppointmentsError] = useState<string | null>(
    null
  );
  const [availabilityBlocksMessage, setAvailabilityBlocksMessage] = useState<
    string | null
  >(null);

  const currentWeekRange = getWeekRange(currentDate);

  useEffect(() => {
    const weekStart = startOfWeek(currentDate);
    const weekEnd = addDays(weekStart, 7);

    async function fetchAppointments() {
      try {
        const response = await fetch(
          `/api/admin/appointments?start=${weekStart.toISOString()}&end=${weekEnd.toISOString()}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch appointments");
        }

        const data: ScheduleAppointment[] = await response.json();

        setAppointments(data);
        setAppointmentsError(null);
      } catch {
        /*
          TEMPORARY MOCK DATA:

          This is only here because the database has no appointment seed data
          yet. It lets us test that appointments appear in the correct day and
          time slots. DT-467 seeds real data and removes this fallback.
        */

        setAppointments(getMockAppointments(currentDate));
        setAppointmentsError("Using mock appointments until backend is ready.");
      }
    }

    async function fetchAvailabilityBlocks() {
      try {
        const response = await fetch(
          `/api/admin/availability-blocks?start=${weekStart.toISOString()}&end=${weekEnd.toISOString()}`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch availability blocks");
        }

        const data: AvailabilityBlock[] = await response.json();

        /*
          TEMPORARY MOCK AVAILABILITY BLOCKS:

          The availability-blocks API works, but the database may not have real
          blocked time records yet. DT-467 seeds real data and removes this.
        */

        if (USE_MOCK_AVAILABILITY_BLOCKS) {
          setAvailabilityBlocks(getMockAvailabilityBlocks(currentDate));
          setAvailabilityBlocksMessage(
            "Using mock availability blocks until real blocked times exist."
          );
        } else {
          setAvailabilityBlocks(data);
          setAvailabilityBlocksMessage(null);
        }
      } catch {
        setAvailabilityBlocks(getMockAvailabilityBlocks(currentDate));
        setAvailabilityBlocksMessage(
          "Using mock availability blocks until backend is ready."
        );
      }
    }

    fetchAppointments();
    fetchAvailabilityBlocks();
  }, [currentDate]);

  function handlePreviousWeek() {
    setCurrentDate((date) => addDays(date, -7));
  }

  function handleNextWeek() {
    setCurrentDate((date) => addDays(date, 7));
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

        {appointmentsError && (
          <p className="mt-4 text-sm text-red-600">{appointmentsError}</p>
        )}

        {availabilityBlocksMessage && (
          <p className="mt-2 text-sm text-red-600">
            {availabilityBlocksMessage}
          </p>
        )}

        <WeekScheduleGrid
          appointments={appointments}
          availabilityBlocks={availabilityBlocks}
        />
      </section>
    </main>
  );
}
