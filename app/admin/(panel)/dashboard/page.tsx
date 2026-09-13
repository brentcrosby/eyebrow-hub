"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  addDays,
  formatTime,
  isSameDay,
  startOfDay,
  toDateParam,
} from "@/lib/dateUtils";
import { getStatusBadgeClasses, getStatusLabel } from "@/lib/appointmentStatus";

type DashboardStats = {
  pendingRequests: number;
  todaysAppointments: number;
  thisWeeksAppointments: number;
  thisWeeksCancellations: number;
};

type DashboardAppointment = {
  id: number;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  notes: string | null;
  startTime: string;
  endTime: string;
  status: string;
  source: string;
  createdAt: string;
  service: { id: number; name: string };
  stylist: { id: number; name: string } | null;
};

type DashboardAppointments = {
  pendingRequests: DashboardAppointment[];
  todaysAppointments: DashboardAppointment[];
};

const statCards: { key: keyof DashboardStats; title: string }[] = [
  { key: "pendingRequests", title: "Pending Requests" },
  { key: "todaysAppointments", title: "Today’s Appointments" },
  { key: "thisWeeksAppointments", title: "This Week" },
  { key: "thisWeeksCancellations", title: "Cancellations" },
];

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

function LoadingCard() {
  return (
    <div className="animate-pulse rounded-2xl bg-[#f3ebe2] px-5 py-4">
      <div className="h-4 w-28 rounded bg-[#dfd0c1]" />
      <div className="mt-3 h-8 w-12 rounded bg-[#dfd0c1]" />
    </div>
  );
}

function SectionState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="px-5 py-10 text-center text-sm text-[#8f725d]" role="status">
      <p>{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-3 rounded-full border border-[#dccab5] px-4 py-2 font-medium text-[#7a5a3c] hover:bg-[#f7eee5]"
        >
          Try Again
        </button>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium ${getStatusBadgeClasses(
        status
      )}`}
    >
      {getStatusLabel(status)}
    </span>
  );
}

function BookingRequestCard({ request }: { request: DashboardAppointment }) {
  return (
    <article className="border-b border-[#e8dac9] px-5 py-5 last:border-b-0">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="truncate text-xl font-semibold text-[#7a5a3c]">
            {request.customerName}
          </h3>
          <StatusBadge status={request.status} />
        </div>
        <p className="mt-1 truncate text-base text-[#7a5a3c]">
          {request.service.name}
        </p>
        <p className="mt-1 text-lg font-medium text-[#7a5a3c]">
          {formatWhen(request.startTime)}
        </p>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[#a08a75]">
        <span>{request.customerPhone}</span>
        {request.customerEmail && <span className="hidden sm:inline">|</span>}
        {request.customerEmail && (
          <span className="truncate">{request.customerEmail}</span>
        )}
      </div>
    </article>
  );
}

function TodaysScheduleRow({ appointment }: { appointment: DashboardAppointment }) {
  return (
    <article className="grid grid-cols-[70px_1fr] gap-3 border-b border-[#e8dac9] py-3 last:border-b-0 sm:grid-cols-[90px_1fr] sm:gap-4">
      <p className="text-sm text-[#7a5a3c] sm:text-base">
        {formatTime(new Date(appointment.startTime))}
      </p>

      <div className="min-w-0 border-l border-[#d8c4ae] pl-3 sm:pl-4">
        <p className="flex items-center gap-2 text-sm text-[#7a5a3c] sm:text-base">
          <span className="truncate">{appointment.service.name}</span>
          <StatusBadge status={appointment.status} />
        </p>
        <p className="truncate text-xs text-[#b19a84]">
          {appointment.customerName}
        </p>
        {appointment.stylist && (
          <p className="truncate text-xs text-[#b19a84]">
            {appointment.stylist.name}
          </p>
        )}
      </div>
    </article>
  );
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [appointments, setAppointments] = useState<DashboardAppointments | null>(
    null
  );
  const [statsLoading, setStatsLoading] = useState(true);
  const [appointmentsLoading, setAppointmentsLoading] = useState(true);
  const [statsError, setStatsError] = useState(false);
  const [appointmentsError, setAppointmentsError] = useState(false);

  const loadStats = useCallback(async () => {
    setStatsLoading(true);
    setStatsError(false);

    try {
      const response = await fetch("/api/admin/dashboard/stats", {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Dashboard totals request failed");
      setStats(await response.json());
    } catch {
      setStatsError(true);
    } finally {
      setStatsLoading(false);
    }
  }, []);

  const loadAppointments = useCallback(async () => {
    setAppointmentsLoading(true);
    setAppointmentsError(false);

    try {
      const response = await fetch("/api/admin/dashboard/appointments", {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("Dashboard appointments request failed");
      setAppointments(await response.json());
    } catch {
      setAppointmentsError(true);
    } finally {
      setAppointmentsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadStats();
    void loadAppointments();

    const refreshTimer = window.setInterval(() => {
      void loadStats();
      void loadAppointments();
    }, 60_000);

    return () => window.clearInterval(refreshTimer);
  }, [loadAppointments, loadStats]);

  const refreshDashboard = () => {
    void loadStats();
    void loadAppointments();
  };

  const pendingRequests = appointments?.pendingRequests ?? [];
  const todaysAppointments = appointments?.todaysAppointments ?? [];
  const isRefreshing = statsLoading || appointmentsLoading;

  return (
    <main className="min-h-full p-3 sm:p-6">
      <section className="mx-auto min-h-[calc(100vh-2rem)] w-full max-w-7xl rounded-[28px] bg-[#fcf8f3] px-4 py-6 shadow-[0_18px_45px_rgba(96,74,50,0.08)] sm:min-h-[calc(100vh-3rem)] sm:px-8 sm:py-8 md:px-10 md:py-10">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-[#b79d84]">
              Admin Dashboard
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-[#7a5a3c]">
              Today’s Overview
            </h1>
          </div>
          <button
            type="button"
            onClick={refreshDashboard}
            disabled={isRefreshing}
            className="rounded-full border border-[#dccab5] px-4 py-2 text-sm font-medium text-[#7a5a3c] hover:bg-[#f7eee5] disabled:cursor-wait disabled:opacity-60"
          >
            {isRefreshing ? "Refreshing…" : "Refresh Dashboard"}
          </button>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-live="polite">
          {statsLoading && !stats
            ? statCards.map((card) => <LoadingCard key={card.key} />)
            : statCards.map((card) => (
                <div
                  key={card.key}
                  className="rounded-2xl bg-[#f3ebe2] px-5 py-4 shadow-sm"
                >
                  <p className="text-sm font-medium text-[#7a5a3c]">
                    {card.title}
                  </p>
                  <p className="mt-2 text-3xl font-semibold text-[#6b4f38]">
                    {stats?.[card.key] ?? "—"}
                  </p>
                </div>
              ))}
        </div>

        {statsError && (
          <div
            className="mt-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            role="alert"
          >
            Dashboard totals could not be loaded.
            <button
              type="button"
              onClick={loadStats}
              className="ml-2 font-semibold underline"
            >
              Try again
            </button>
          </div>
        )}

        <div className="mt-8 grid gap-6 xl:grid-cols-[2fr_1.05fr]">
          <section className="overflow-hidden rounded-3xl border border-[#eadfce] bg-[#fffaf4]">
            <div className="border-b border-[#e8dac9] px-5 py-4">
              <h2 className="text-lg font-semibold text-[#7a5a3c]">
                Pending Requests
              </h2>
            </div>

            {appointmentsLoading && !appointments ? (
              <div
                className="animate-pulse space-y-4 px-5 py-6"
                aria-label="Loading pending requests"
              >
                <div className="h-24 rounded-2xl bg-[#eee2d6]" />
                <div className="h-24 rounded-2xl bg-[#eee2d6]" />
              </div>
            ) : appointmentsError ? (
              <SectionState
                message="Pending requests could not be loaded."
                onRetry={loadAppointments}
              />
            ) : pendingRequests.length === 0 ? (
              <SectionState message="There are no pending booking requests." />
            ) : (
              <div>
                {pendingRequests.map((request) => (
                  <BookingRequestCard key={request.id} request={request} />
                ))}
              </div>
            )}
          </section>

          <section className="rounded-3xl border border-[#eadfce] bg-[#fffaf4] px-5 py-4">
            <div className="border-b border-[#e8dac9] pb-3">
              <h2 className="text-lg font-semibold text-[#7a5a3c]">
                Today’s Schedule
              </h2>
            </div>

            {appointmentsLoading && !appointments ? (
              <div
                className="animate-pulse space-y-3 py-5"
                aria-label="Loading today’s schedule"
              >
                <div className="h-16 rounded-2xl bg-[#eee2d6]" />
                <div className="h-16 rounded-2xl bg-[#eee2d6]" />
                <div className="h-16 rounded-2xl bg-[#eee2d6]" />
              </div>
            ) : appointmentsError ? (
              <SectionState
                message="Today’s schedule could not be loaded."
                onRetry={loadAppointments}
              />
            ) : todaysAppointments.length === 0 ? (
              <SectionState message="There are no appointments scheduled today." />
            ) : (
              <div className="pt-2">
                {todaysAppointments.map((appointment) => (
                  <TodaysScheduleRow
                    key={appointment.id}
                    appointment={appointment}
                  />
                ))}
              </div>
            )}

            <div className="pt-4 text-center">
              <Link
                href={`/admin/schedule?date=${toDateParam(new Date())}&view=day`}
                className="text-sm font-medium text-[#8f725d] hover:underline"
              >
                View Full Schedule
              </Link>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
