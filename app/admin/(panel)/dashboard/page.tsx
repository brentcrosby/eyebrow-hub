"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  addDays,
  formatTime,
  isSameDay,
  startOfDay,
  startOfWeek,
  toDateParam,
} from "@/lib/dateUtils";
import { getStatusBadgeClasses, getStatusLabel } from "@/lib/appointmentStatus";
import {
  ScheduleErrorState,
  ScheduleLoadingState,
} from "@/components/admin/schedule/ScheduleStates";

type ScheduleItem = {
  kind: "appointment" | "block";
  id: number;
  startTime: string;
  endTime: string;
  title: string;
  subtitle: string;
  status: string | null;
};

type PendingRequest = {
  id: number;
  customerName: string;
  serviceName: string;
  startTime: string;
  phone: string;
  email: string | null;
};

type DashboardSummary = {
  pendingCount: number;
  todayCount: number;
  weekCount: number;
  cancelledThisWeekCount: number;
  todaysItems: ScheduleItem[];
  pendingRequests: PendingRequest[];
};

/** "Today - 10:00 AM" / "Tomorrow - 10:00 AM" / "Sep 12 - 10:00 AM". */
function formatWhen(value: string) {
  const date = new Date(value);
  const today = startOfDay(new Date());

  const dayLabel = isSameDay(date, today)
    ? "Today"
    : isSameDay(date, addDays(today, 1))
      ? "Tomorrow"
      : date.toLocaleDateString("en-US", { month: "short", day: "numeric" });

  return `${dayLabel} - ${formatTime(date)}`;
}

function DashboardStatCard({ title, value }: { title: string; value: number }) {
  return (
    <div className="rounded-2xl bg-[#f3ebe2] px-5 py-4 shadow-sm">
      <p className="text-sm font-medium text-[#7a5a3c]">{title}</p>
      <p className="mt-2 text-3xl font-semibold text-[#6b4f38]">{value}</p>
    </div>
  );
}

function BookingRequestCard({ request }: { request: PendingRequest }) {
  return (
    <div className="border-b border-[#e8dac9] px-5 py-5 last:border-b-0">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h3 className="truncate text-xl font-semibold text-[#7a5a3c]">
            {request.customerName}
          </h3>
          <p className="mt-1 truncate text-base text-[#7a5a3c]">
            {request.serviceName}
          </p>
          <p className="mt-1 text-lg font-medium text-[#7a5a3c]">
            {formatWhen(request.startTime)}
          </p>
        </div>

        {/* Approving or rejecting needs a write endpoint for appointments,
            which does not exist yet. Disabled rather than silently inert, so
            the control does not look like it worked. */}
        <div className="flex shrink-0 items-center gap-2 pt-1">
          <button
            type="button"
            disabled
            title="Approving requests is not available yet"
            aria-label={`Approve booking request for ${request.customerName} (not available yet)`}
            className="flex h-10 w-10 cursor-not-allowed items-center justify-center rounded-xl bg-green-700 text-lg font-bold text-white opacity-40"
          >
            ✓
          </button>
          <button
            type="button"
            disabled
            title="Rejecting requests is not available yet"
            aria-label={`Reject booking request for ${request.customerName} (not available yet)`}
            className="flex h-10 w-10 cursor-not-allowed items-center justify-center rounded-xl bg-red-700 text-lg font-bold text-white opacity-40"
          >
            ✕
          </button>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[#a08a75]">
        <span>{request.phone}</span>
        {request.email && <span className="hidden sm:inline">|</span>}
        {request.email && <span className="truncate">{request.email}</span>}
      </div>
    </div>
  );
}

function TodaysScheduleRow({ item }: { item: ScheduleItem }) {
  return (
    <div className="grid grid-cols-[70px_1fr] gap-3 border-b border-[#e8dac9] py-3 last:border-b-0 sm:grid-cols-[90px_1fr] sm:gap-4">
      <p className="text-sm text-[#7a5a3c] sm:text-base">
        {formatTime(new Date(item.startTime))}
      </p>

      <div className="min-w-0 border-l border-[#d8c4ae] pl-3 sm:pl-4">
        <p className="flex items-center gap-2 text-sm text-[#7a5a3c] sm:text-base">
          <span className="truncate">{item.title}</span>
          {item.status && (
            <span
              className={`shrink-0 rounded-full border px-1.5 text-[10px] font-medium ${getStatusBadgeClasses(
                item.status
              )}`}
            >
              {getStatusLabel(item.status)}
            </span>
          )}
        </p>
        <p className="truncate text-xs text-[#b19a84]">{item.subtitle}</p>
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const retry = useCallback(() => setReloadKey((key) => key + 1), []);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setIsLoading(true);
      setError(null);

      // Boundaries come from the browser so "today" means the viewer's today.
      const dayStart = startOfDay(new Date());
      const weekStart = startOfWeek(new Date());

      const params = new URLSearchParams({
        dayStart: dayStart.toISOString(),
        dayEnd: addDays(dayStart, 1).toISOString(),
        weekStart: weekStart.toISOString(),
        weekEnd: addDays(weekStart, 7).toISOString(),
      });

      try {
        const response = await fetch(
          `/api/admin/dashboard-summary?${params.toString()}`,
          { signal: controller.signal }
        );

        if (!response.ok) throw new Error("Request failed");

        setSummary(await response.json());
        setIsLoading(false);
      } catch (caught) {
        if ((caught as Error)?.name === "AbortError") return;

        console.error("Failed to load dashboard:", caught);
        setSummary(null);
        setError("The dashboard could not be loaded.");
        setIsLoading(false);
      }
    }

    load();

    return () => controller.abort();
  }, [reloadKey]);

  const statCards = [
    { title: "Pending Requests", value: summary?.pendingCount ?? 0 },
    { title: "Today’s Appointments", value: summary?.todayCount ?? 0 },
    { title: "This Week", value: summary?.weekCount ?? 0 },
    { title: "Cancellations", value: summary?.cancelledThisWeekCount ?? 0 },
  ];

  return (
    <main className="min-h-full p-3 sm:p-6">
      <section className="mx-auto min-h-[calc(100vh-2rem)] w-full max-w-7xl rounded-[28px] bg-[#fcf8f3] px-4 py-6 shadow-[0_18px_45px_rgba(96,74,50,0.08)] sm:min-h-[calc(100vh-3rem)] sm:px-8 sm:py-8 md:px-10 md:py-10">
        {error ? (
          <ScheduleErrorState message={error} onRetry={retry} />
        ) : isLoading || !summary ? (
          <ScheduleLoadingState rowCount={5} />
        ) : (
          <>
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {statCards.map((card) => (
                <DashboardStatCard
                  key={card.title}
                  title={card.title}
                  value={card.value}
                />
              ))}
            </div>

            <div className="mt-8 grid gap-6 xl:grid-cols-[2fr_1.05fr]">
              <section className="overflow-hidden rounded-3xl border border-[#eadfce] bg-[#fffaf4]">
                <div className="border-b border-[#e8dac9] px-5 py-4">
                  <h2 className="text-lg font-semibold text-[#7a5a3c]">
                    New Booking Requests
                  </h2>
                </div>

                {summary.pendingRequests.length === 0 ? (
                  <p role="status" className="px-5 py-6 text-sm text-[#7a5a3c]">
                    No pending booking requests.
                  </p>
                ) : (
                  <div>
                    {summary.pendingRequests.map((request) => (
                      <BookingRequestCard key={request.id} request={request} />
                    ))}
                  </div>
                )}

                <div className="px-5 py-4 text-xs text-[#c0ab96]">
                  Approving and rejecting requests is not available yet.
                </div>
              </section>

              <section className="rounded-3xl border border-[#eadfce] bg-[#fffaf4] px-5 py-4">
                <div className="border-b border-[#e8dac9] pb-3">
                  <h2 className="text-lg font-semibold text-[#7a5a3c]">
                    Today&apos;s Schedule
                  </h2>
                </div>

                <div className="pt-2">
                  {summary.todaysItems.length === 0 ? (
                    <p role="status" className="py-6 text-sm text-[#7a5a3c]">
                      No appointments or blocked time today.
                    </p>
                  ) : (
                    summary.todaysItems.map((item) => (
                      <TodaysScheduleRow
                        key={`${item.kind}-${item.id}`}
                        item={item}
                      />
                    ))
                  )}
                </div>

                <div className="pt-4 text-center">
                  <Link
                    href={`/admin/schedule?date=${toDateParam(new Date())}&view=day`}
                    className="text-sm font-medium text-[#b39a81] hover:underline"
                  >
                    View Full Schedule
                  </Link>
                </div>
              </section>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
