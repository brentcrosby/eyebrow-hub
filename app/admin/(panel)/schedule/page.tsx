"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
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
  ScheduleEmptyState,
  ScheduleErrorState,
  ScheduleLoadingState,
} from "@/components/admin/schedule/ScheduleStates";
import type {
  AvailabilityBlock,
  ScheduleAppointment,
  ScheduleView,
} from "@/components/admin/schedule/types";

function isAbort(error: unknown) {
  return (error as Error)?.name === "AbortError";
}

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
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const retry = useCallback(() => setReloadKey((key) => key + 1), []);

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

    const rangeStart =
      view === "week" ? startOfWeek(selectedDate) : startOfDay(selectedDate);
    const rangeEnd = addDays(rangeStart, view === "week" ? 7 : 1);
    const range = `start=${rangeStart.toISOString()}&end=${rangeEnd.toISOString()}`;

    async function load() {
      setIsLoading(true);
      setError(null);

      try {
        const [hoursResponse, appointmentsResponse, blocksResponse] =
          await Promise.all([
            fetch("/api/business-hours", { signal: controller.signal }),
            fetch(`/api/admin/appointments?${range}`, {
              signal: controller.signal,
            }),
            fetch(`/api/admin/availability-blocks?${range}`, {
              signal: controller.signal,
            }),
          ]);

        if (
          !hoursResponse.ok ||
          !appointmentsResponse.ok ||
          !blocksResponse.ok
        ) {
          throw new Error("Request failed");
        }

        const [hours, appointmentData, blockData] = await Promise.all([
          hoursResponse.json(),
          appointmentsResponse.json(),
          blocksResponse.json(),
        ]);

        setBusinessHours(hours);
        setAppointments(appointmentData);
        setAvailabilityBlocks(blockData);
        setIsLoading(false);
      } catch (caught) {
        if (isAbort(caught)) return;

        console.error("Failed to load schedule:", caught);

        // No fallback data: showing invented appointments would be worse than
        // showing nothing, because staff cannot tell the difference.
        setAppointments([]);
        setAvailabilityBlocks([]);
        setError("The schedule could not be loaded.");
        setIsLoading(false);
      }
    }

    load();

    return () => controller.abort();
  }, [selectedDate, view, reloadKey]);

  const isEmpty =
    !isLoading &&
    !error &&
    appointments.length === 0 &&
    availabilityBlocks.length === 0;

  const emptyMessage =
    view === "week"
      ? "No appointments or blocked time this week."
      : "No appointments or blocked time for this day.";

  function renderSchedule() {
    if (error) {
      return <ScheduleErrorState message={error} onRetry={retry} />;
    }

    if (isLoading || !businessHours) {
      return <ScheduleLoadingState rowCount={view === "week" ? 6 : 5} />;
    }

    return (
      <div className="relative">
        {view === "week" ? (
          <WeekScheduleGrid
            weekStart={startOfWeek(selectedDate)}
            appointments={appointments}
            availabilityBlocks={availabilityBlocks}
          />
        ) : (
          hoursForDay && (
            <DayScheduleGrid
              date={selectedDate}
              hours={hoursForDay}
              appointments={appointments}
              availabilityBlocks={availabilityBlocks}
            />
          )
        )}

        {isEmpty && <ScheduleEmptyState message={emptyMessage} />}
      </div>
    );
  }

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

        {renderSchedule()}
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
