"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { BusinessHoursDay } from "@/lib/businessHours";
import {
  addDays,
  parseDateParam,
  startOfDay,
  startOfWeek,
  toDateParam,
} from "@/lib/dateUtils";
import DayScheduleGrid from "@/components/admin/schedule/DayScheduleGrid";
import ScheduleDayNav from "@/components/admin/schedule/ScheduleDayNav";
import WeekScheduleGrid from "@/components/admin/schedule/WeekScheduleGrid";
import {
  getMockAppointments,
  getMockAvailabilityBlocks,
} from "@/components/admin/schedule/mockData";
import type {
  AvailabilityBlock,
  ScheduleAppointment,
  ScheduleView,
} from "@/components/admin/schedule/types";

// TEMPORARY TEST FLAG:
// Now false: real availability blocks exist, and overriding a successful API
// response with fabricated ones hid the blocked time this view is meant to
// show. The remaining mock fallbacks are removed in DT-467.
const USE_MOCK_AVAILABILITY_BLOCKS = false;

function SchedulePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const dateParam = searchParams.get("date");
  const view: ScheduleView =
    searchParams.get("view") === "week" ? "week" : "day";

  // Memoised on the raw param so the fetch effect is not re-run by a new Date
  // instance on every render. An unparseable or missing date falls back to
  // today rather than rendering a plausible but wrong day.
  const selectedDate = useMemo(
    () => parseDateParam(dateParam) ?? startOfDay(new Date()),
    [dateParam]
  );

  const [businessHours, setBusinessHours] = useState<BusinessHoursDay[] | null>(
    null
  );
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

  const hoursForDay =
    businessHours?.find((day) => day.dayOfWeek === selectedDate.getDay()) ??
    null;

  function updateParams(next: { date?: Date; view?: ScheduleView }) {
    const params = new URLSearchParams();
    params.set("date", toDateParam(next.date ?? selectedDate));
    params.set("view", next.view ?? view);

    router.replace(`/admin/schedule?${params.toString()}`);
  }

  useEffect(() => {
    const controller = new AbortController();

    fetch("/api/business-hours", { signal: controller.signal })
      .then((response) => response.json())
      .then((data: BusinessHoursDay[]) => setBusinessHours(data))
      .catch((error) => {
        if (error?.name === "AbortError") return;
        console.error("Failed to load business hours:", error);
      });

    return () => controller.abort();
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const rangeStart =
      view === "week" ? startOfWeek(selectedDate) : startOfDay(selectedDate);
    const rangeEnd = addDays(rangeStart, view === "week" ? 7 : 1);

    const range = `start=${rangeStart.toISOString()}&end=${rangeEnd.toISOString()}`;

    async function fetchAppointments() {
      try {
        const response = await fetch(`/api/admin/appointments?${range}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error("Failed to fetch appointments");
        }

        const data: ScheduleAppointment[] = await response.json();

        setAppointments(data);
        setAppointmentsError(null);
      } catch (error) {
        if ((error as Error)?.name === "AbortError") return;

        // TEMPORARY MOCK DATA — removed in DT-467 once the seed provides rows.
        setAppointments(getMockAppointments(selectedDate));
        setAppointmentsError("Using mock appointments until backend is ready.");
      }
    }

    async function fetchAvailabilityBlocks() {
      try {
        const response = await fetch(
          `/api/admin/availability-blocks?${range}`,
          { signal: controller.signal }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch availability blocks");
        }

        const data: AvailabilityBlock[] = await response.json();

        // TEMPORARY MOCK BLOCKS — removed in DT-467.
        if (USE_MOCK_AVAILABILITY_BLOCKS) {
          setAvailabilityBlocks(getMockAvailabilityBlocks(selectedDate));
          setAvailabilityBlocksMessage(
            "Using mock availability blocks until real blocked times exist."
          );
        } else {
          setAvailabilityBlocks(data);
          setAvailabilityBlocksMessage(null);
        }
      } catch (error) {
        if ((error as Error)?.name === "AbortError") return;

        setAvailabilityBlocks(getMockAvailabilityBlocks(selectedDate));
        setAvailabilityBlocksMessage(
          "Using mock availability blocks until backend is ready."
        );
      }
    }

    fetchAppointments();
    fetchAvailabilityBlocks();

    return () => controller.abort();
  }, [selectedDate, view]);

  return (
    <main className="min-h-full p-3 sm:p-6">
      <section className="mx-auto w-full max-w-[1400px] rounded-[28px] bg-[#fcf8f3] px-3 py-5 shadow-[0_18px_45px_rgba(96,74,50,0.08)] sm:px-8 sm:py-8">
        <ScheduleDayNav
          selectedDate={selectedDate}
          view={view}
          hours={hoursForDay}
          onDateChange={(date) => updateParams({ date })}
          onViewChange={(nextView) => updateParams({ view: nextView })}
        />

        {appointmentsError && (
          <p className="mt-4 text-sm text-red-600">{appointmentsError}</p>
        )}

        {availabilityBlocksMessage && (
          <p className="mt-2 text-sm text-red-600">
            {availabilityBlocksMessage}
          </p>
        )}

        {view === "week" ? (
          <WeekScheduleGrid
            weekStart={startOfWeek(selectedDate)}
            appointments={appointments}
            availabilityBlocks={availabilityBlocks}
          />
        ) : hoursForDay ? (
          <DayScheduleGrid
            date={selectedDate}
            hours={hoursForDay}
            appointments={appointments}
            availabilityBlocks={availabilityBlocks}
          />
        ) : (
          <p className="mt-6 text-sm text-[#7a5a3c]">Loading schedule…</p>
        )}
      </section>
    </main>
  );
}

export default function AdminSchedulePage() {
  // useSearchParams needs a Suspense boundary or the production build fails
  // while prerendering this route.
  return (
    <Suspense
      fallback={
        <main className="min-h-full p-3 sm:p-6">
          <p className="text-sm text-[#7a5a3c]">Loading schedule…</p>
        </main>
      }
    >
      <SchedulePageContent />
    </Suspense>
  );
}
