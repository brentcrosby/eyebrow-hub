"use client";

import { useCallback, useEffect, useState } from "react";
import { DAY_NAMES } from "@/lib/businessHours";
import {
  addSalonDays,
  formatSalonDate,
  formatSalonTime,
} from "@/lib/salonTime";

type BusinessHour = {
  dayOfWeek: number;
  enabled: boolean;
  openMinutes: number;
  closeMinutes: number;
};

type SchedulingRule = {
  minimumNoticeMinutes: number;
  maximumAdvanceDays: number;
  bufferMinutes: number;
};

type Block = {
  id: number;
  startTime: string;
  endTime: string;
  reason: string | null;
};

type Closure = {
  id: number;
  closureDate: string;
  startTime: string;
  endTime: string;
  reason: string | null;
};

const minutesToTime = (minutes: number) =>
  `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(
    minutes % 60
  ).padStart(2, "0")}`;

const timeToMinutes = (time: string) => {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
};

export default function AdminAvailabilityPage() {
  const [businessHours, setBusinessHours] = useState<BusinessHour[]>([]);

  const [schedulingRule, setSchedulingRule] =
    useState<SchedulingRule>({
      minimumNoticeMinutes: 120,
      maximumAdvanceDays: 30,
      bufferMinutes: 15,
    });

  const [blocks, setBlocks] = useState<Block[]>([]);
  const [closures, setClosures] = useState<Closure[]>([]);
  const [savingClosure, setSavingClosure] = useState(false);

  const [closureForm, setClosureForm] = useState({
    date: "",
    fullDay: true,
    startTime: "",
    endTime: "",
    reason: "",
  });

  const [blockForm, setBlockForm] = useState({
    date: "",
    startTime: "",
    endTime: "",
    reason: "",
  });

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setMessage("");

    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date(start);
    end.setFullYear(end.getFullYear() + 1);

    const closureStart = formatSalonDate(new Date());
    const closureEnd = addSalonDays(closureStart, 366);

    try {
      const [
        settingsResponse,
        blocksResponse,
        closuresResponse,
      ] = await Promise.all([
        fetch("/api/admin/availability-settings"),
        fetch(
          `/api/admin/availability-blocks?start=${encodeURIComponent(
            start.toISOString()
          )}&end=${encodeURIComponent(end.toISOString())}`
        ),
        fetch(
          `/api/admin/closures?start=${encodeURIComponent(
            closureStart
          )}&end=${encodeURIComponent(closureEnd)}`
        ),
      ]);

      const settings = await settingsResponse.json();
      const savedBlocks = await blocksResponse.json();
      const savedClosures = await closuresResponse.json();

      if (!settingsResponse.ok) {
        throw new Error(
          settings.error ?? "Could not load availability settings"
        );
      }

      if (!blocksResponse.ok) {
        throw new Error(
          savedBlocks.error ?? "Could not load unavailable times"
        );
      }

      if (!closuresResponse.ok) {
        throw new Error(
          savedClosures.error ?? "Could not load closures"
        );
      }

      setBusinessHours(settings.businessHours);
      setSchedulingRule(settings.schedulingRule);
      setBlocks(savedBlocks);
      setClosures(savedClosures);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Could not load availability"
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function updateHour(
    dayOfWeek: number,
    changes: Partial<BusinessHour>
  ) {
    setBusinessHours((current) =>
      current.map((day) =>
        day.dayOfWeek === dayOfWeek
          ? {
              ...day,
              ...changes,
            }
          : day
      )
    );
  }

  async function saveSettings() {
    setMessage("");

    const response = await fetch(
      "/api/admin/availability-settings",
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          businessHours,
          schedulingRule,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      setMessage(result.error ?? "Could not save settings");
      return;
    }

    setBusinessHours(result.businessHours);
    setSchedulingRule(result.schedulingRule);
    setMessage("Availability settings saved.");
  }

  async function addBlock() {
    setMessage("");

    if (
      !blockForm.date ||
      !blockForm.startTime ||
      !blockForm.endTime
    ) {
      setMessage("Date, start time, and end time are required.");
      return;
    }

    const response = await fetch(
      "/api/admin/availability-blocks",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          startTime: new Date(
            `${blockForm.date}T${blockForm.startTime}:00`
          ).toISOString(),
          endTime: new Date(
            `${blockForm.date}T${blockForm.endTime}:00`
          ).toISOString(),
          reason: blockForm.reason,
        }),
      }
    );

    const result = await response.json();

    if (!response.ok) {
      setMessage(
        result.error ?? "Could not add unavailable time"
      );
      return;
    }

    setBlocks((current) =>
      [...current, result].sort((first, second) =>
        first.startTime.localeCompare(second.startTime)
      )
    );

    setBlockForm({
      date: "",
      startTime: "",
      endTime: "",
      reason: "",
    });

    setMessage("Unavailable time added.");
  }

  async function deleteBlock(id: number) {
    setMessage("");

    const response = await fetch(
      `/api/admin/availability-blocks?id=${id}`,
      {
        method: "DELETE",
      }
    );

    if (!response.ok) {
      const result = await response.json();

      setMessage(
        result.error ?? "Could not delete unavailable time"
      );
      return;
    }

    setBlocks((current) =>
      current.filter((block) => block.id !== id)
    );

    setMessage("Unavailable time deleted.");
  }

  async function addClosure() {
    if (savingClosure) return;

    setMessage("");

    if (!closureForm.date) {
      setMessage("Choose a closure date.");
      return;
    }

    if (
      !closureForm.fullDay &&
      (!closureForm.startTime || !closureForm.endTime)
    ) {
      setMessage("Enter a start time and an end time.");
      return;
    }

    setSavingClosure(true);

    try {
      const response = await fetch("/api/admin/closures", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(closureForm),
      });

      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error ?? "Could not add closure.");
        return;
      }

      setClosures((current) =>
        [...current, result].sort((first, second) =>
          first.startTime.localeCompare(second.startTime)
        )
      );

      setClosureForm({
        date: "",
        fullDay: true,
        startTime: "",
        endTime: "",
        reason: "",
      });

      setMessage("Salon closure added.");
    } catch {
      setMessage("Could not add closure. Please try again.");
    } finally {
      setSavingClosure(false);
    }
  }

  async function deleteClosure(id: number) {
    setMessage("");

    try {
      const response = await fetch(
        `/api/admin/closures/${id}`,
        {
          method: "DELETE",
        }
      );

      if (!response.ok) {
        const result = await response.json();
        setMessage(result.error ?? "Could not delete closure.");
        return;
      }

      setClosures((current) =>
        current.filter((closure) => closure.id !== id)
      );

      setMessage("Salon closure deleted.");
    } catch {
      setMessage("Could not delete closure. Please try again.");
    }
  }

  return (
    <main className="min-h-full p-4 sm:p-6">
      <section className="mx-auto w-full max-w-6xl rounded-[28px] bg-white px-5 py-6 shadow-[0_18px_45px_rgba(96,74,50,0.08)] sm:px-8 sm:py-8">
        <div className="border-b border-[#d8c4ae] pb-5">
          <p className="text-sm uppercase tracking-[0.24em] text-[#b79d84]">
            Admin Availability
          </p>

          <h1 className="mt-2 text-3xl font-semibold text-[#7a5a3c]">
            Availability
          </h1>
        </div>

        {message && (
          <p
            role="status"
            className="mt-5 rounded-xl bg-[#f6e9db] p-3 text-sm text-[#7a5a3c]"
          >
            {message}
          </p>
        )}

        {loading ? (
          <p className="mt-8 text-[#7a5a3c]">
            Loading saved availability...
          </p>
        ) : (
          <div className="mt-8 space-y-6">
            <section className="rounded-3xl border border-[#eadfce] bg-[#fffdf9] p-6">
              <h2 className="inline-flex rounded-full bg-[#f6e9db] px-4 py-2 text-sm font-semibold text-[#7a5a3c]">
                Weekly Business Hours
              </h2>

              <div className="mt-4 overflow-hidden rounded-2xl border border-[#eadfce] bg-white">
                {businessHours.map((day) => (
                  <div
                    key={day.dayOfWeek}
                    className="grid gap-4 border-b border-[#efe4d7] px-4 py-4 last:border-b-0 md:grid-cols-[140px_1fr_1fr_auto] md:items-center"
                  >
                    <p className="text-sm font-medium text-[#5e4735]">
                      {DAY_NAMES[day.dayOfWeek]}
                    </p>

                    <input
                      type="time"
                      step={3600}
                      disabled={!day.enabled}
                      value={minutesToTime(day.openMinutes)}
                      onChange={(event) =>
                        updateHour(day.dayOfWeek, {
                          openMinutes: timeToMinutes(
                            event.target.value
                          ),
                        })
                      }
                      className="rounded-full border border-[#dccab5] bg-[#fffaf4] px-4 py-2 text-sm"
                    />

                    <input
                      type="time"
                      step={3600}
                      disabled={!day.enabled}
                      value={minutesToTime(day.closeMinutes)}
                      onChange={(event) =>
                        updateHour(day.dayOfWeek, {
                          closeMinutes: timeToMinutes(
                            event.target.value
                          ),
                        })
                      }
                      className="rounded-full border border-[#dccab5] bg-[#fffaf4] px-4 py-2 text-sm"
                    />

                    <button
                      type="button"
                      onClick={() =>
                        updateHour(day.dayOfWeek, {
                          enabled: !day.enabled,
                        })
                      }
                      className={`flex h-8 w-14 items-center rounded-full p-1 ${
                        day.enabled
                          ? "bg-[#5f8444]"
                          : "bg-[#d7c9bb]"
                      }`}
                      aria-pressed={day.enabled}
                      aria-label={`Toggle ${
                        DAY_NAMES[day.dayOfWeek]
                      }`}
                    >
                      <span
                        className={`h-6 w-6 rounded-full bg-white transition ${
                          day.enabled ? "translate-x-6" : ""
                        }`}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <div className="grid gap-6 lg:grid-cols-2">
              <section className="rounded-3xl border border-[#eadfce] bg-[#fffdf9] p-6">
                <h2 className="inline-flex rounded-full bg-[#f6e9db] px-4 py-2 text-sm font-semibold text-[#7a5a3c]">
                  Unavailable Times
                </h2>

                <div className="mt-4 grid gap-3">
                  <input
                    type="date"
                    value={blockForm.date}
                    onChange={(event) =>
                      setBlockForm({
                        ...blockForm,
                        date: event.target.value,
                      })
                    }
                    className="rounded-full border border-[#dccab5] px-4 py-2"
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="time"
                      value={blockForm.startTime}
                      onChange={(event) =>
                        setBlockForm({
                          ...blockForm,
                          startTime: event.target.value,
                        })
                      }
                      className="rounded-full border border-[#dccab5] px-4 py-2"
                    />

                    <input
                      type="time"
                      value={blockForm.endTime}
                      onChange={(event) =>
                        setBlockForm({
                          ...blockForm,
                          endTime: event.target.value,
                        })
                      }
                      className="rounded-full border border-[#dccab5] px-4 py-2"
                    />
                  </div>

                  <input
                    placeholder="Reason (optional)"
                    value={blockForm.reason}
                    onChange={(event) =>
                      setBlockForm({
                        ...blockForm,
                        reason: event.target.value,
                      })
                    }
                    className="rounded-full border border-[#dccab5] px-4 py-2"
                  />

                  <button
                    type="button"
                    onClick={addBlock}
                    className="rounded-full bg-[#7a5a3c] px-4 py-2 text-white"
                  >
                    Add Unavailable Time
                  </button>
                </div>

                <div className="mt-4 space-y-3">
                  {blocks.map((block) => {
                    const start = new Date(block.startTime);
                    const end = new Date(block.endTime);

                    return (
                      <div
                        key={block.id}
                        className="flex items-center justify-between rounded-2xl border border-[#efe4d7] px-4 py-3 text-sm text-[#7a5a3c]"
                      >
                        <div>
                          <p>
                            {start.toLocaleDateString()} ·{" "}
                            {start.toLocaleTimeString([], {
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                            –
                            {end.toLocaleTimeString([], {
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </p>

                          {block.reason && (
                            <p className="text-[#9a816b]">
                              {block.reason}
                            </p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => deleteBlock(block.id)}
                          className="rounded-full border border-[#dccab5] px-3 py-1"
                        >
                          Delete
                        </button>
                      </div>
                    );
                  })}
                </div>
              </section>

              <section className="rounded-3xl border border-[#eadfce] bg-[#fffdf9] p-6">
                <h2 className="inline-flex rounded-full bg-[#f6e9db] px-4 py-2 text-sm font-semibold text-[#7a5a3c]">
                  Salon Closures
                </h2>

                <p className="mt-3 text-sm text-[#7a5a3c]">
                  Closure dates and times use Pacific Time.
                </p>

                <div className="mt-4 grid gap-3">
                  <label className="grid gap-2 text-sm text-[#7a5a3c]">
                    Closure date (Pacific Time)
                    <input
                      type="date"
                      value={closureForm.date}
                      onChange={(event) =>
                        setClosureForm({
                          ...closureForm,
                          date: event.target.value,
                        })
                      }
                      className="rounded-full border border-[#dccab5] px-4 py-2"
                    />
                  </label>

                  <label className="flex items-center gap-2 text-sm text-[#7a5a3c]">
                    <input
                      type="checkbox"
                      checked={closureForm.fullDay}
                      onChange={(event) =>
                        setClosureForm({
                          ...closureForm,
                          fullDay: event.target.checked,
                        })
                      }
                    />
                    Close for the full day
                  </label>

                  {!closureForm.fullDay && (
                    <div className="grid grid-cols-2 gap-3">
                      <label className="grid gap-2 text-sm text-[#7a5a3c]">
                        Start time (Pacific Time)
                        <input
                          type="time"
                          value={closureForm.startTime}
                          onChange={(event) =>
                            setClosureForm({
                              ...closureForm,
                              startTime: event.target.value,
                            })
                          }
                          className="rounded-full border border-[#dccab5] px-4 py-2"
                        />
                      </label>

                      <label className="grid gap-2 text-sm text-[#7a5a3c]">
                        End time (Pacific Time)
                        <input
                          type="time"
                          value={closureForm.endTime}
                          onChange={(event) =>
                            setClosureForm({
                              ...closureForm,
                              endTime: event.target.value,
                            })
                          }
                          className="rounded-full border border-[#dccab5] px-4 py-2"
                        />
                      </label>
                    </div>
                  )}

                  <label className="grid gap-2 text-sm text-[#7a5a3c]">
                    Reason (optional, up to 120 characters)
                    <input
                      maxLength={120}
                      value={closureForm.reason}
                      onChange={(event) =>
                        setClosureForm({
                          ...closureForm,
                          reason: event.target.value,
                        })
                      }
                      className="rounded-full border border-[#dccab5] px-4 py-2"
                    />
                  </label>

                  <button
                    type="button"
                    onClick={addClosure}
                    disabled={savingClosure}
                    className="rounded-full bg-[#7a5a3c] px-4 py-2 text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {savingClosure
                      ? "Saving closure..."
                      : "Add Closure"}
                  </button>
                </div>

                <div className="mt-5 space-y-3">
                  {closures.length === 0 ? (
                    <p className="text-sm text-[#9a816b]">
                      No saved closures.
                    </p>
                  ) : (
                    closures.map((closure) => {
                      const starts = new Date(closure.startTime);
                      const ends = new Date(closure.endTime);
                      const isAllDay =
                        ends.getTime() - starts.getTime() >=
                        23 * 60 * 60 * 1000;

                      return (
                        <div
                          key={closure.id}
                          className="flex items-center justify-between gap-3 rounded-2xl border border-[#efe4d7] px-4 py-3 text-sm text-[#7a5a3c]"
                        >
                          <div>
                            <p>
                              {formatSalonDate(starts)} ·{" "}
                              {isAllDay
                                ? "All day"
                                : `${formatSalonTime(starts)} – ${formatSalonTime(ends)}`}{" "}
                              (Pacific Time)
                            </p>

                            {closure.reason && (
                              <p className="text-[#9a816b]">
                                {closure.reason}
                              </p>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() =>
                              deleteClosure(closure.id)
                            }
                            className="rounded-full border border-[#dccab5] px-3 py-1"
                          >
                            Delete
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>
              </section>

              <section className="rounded-3xl border border-[#eadfce] bg-[#fffdf9] p-6">
                <h2 className="inline-flex rounded-full bg-[#f6e9db] px-4 py-2 text-sm font-semibold text-[#7a5a3c]">
                  Scheduling Rules
                </h2>

                <div className="mt-4 grid gap-4">
                  <label className="grid gap-2 text-sm text-[#7a5a3c]">
                    Minimum Notice (minutes)
                    <input
                      type="number"
                      min="0"
                      value={schedulingRule.minimumNoticeMinutes}
                      onChange={(event) =>
                        setSchedulingRule({
                          ...schedulingRule,
                          minimumNoticeMinutes: Number(
                            event.target.value
                          ),
                        })
                      }
                      className="rounded-full border border-[#dccab5] px-4 py-2"
                    />
                  </label>

                  <label className="grid gap-2 text-sm text-[#7a5a3c]">
                    Maximum Advance Booking (days)
                    <input
                      type="number"
                      min="1"
                      value={schedulingRule.maximumAdvanceDays}
                      onChange={(event) =>
                        setSchedulingRule({
                          ...schedulingRule,
                          maximumAdvanceDays: Number(
                            event.target.value
                          ),
                        })
                      }
                      className="rounded-full border border-[#dccab5] px-4 py-2"
                    />
                  </label>

                  <label className="grid gap-2 text-sm text-[#7a5a3c]">
                    Buffer Between Appointments (minutes)
                    <input
                      type="number"
                      min="0"
                      value={schedulingRule.bufferMinutes}
                      onChange={(event) =>
                        setSchedulingRule({
                          ...schedulingRule,
                          bufferMinutes: Number(
                            event.target.value
                          ),
                        })
                      }
                      className="rounded-full border border-[#dccab5] px-4 py-2"
                    />
                  </label>
                </div>
              </section>
            </div>

            <button
              type="button"
              onClick={saveSettings}
              className="rounded-full bg-[#5f8444] px-6 py-3 font-medium text-white"
            >
              Save Availability Settings
            </button>
          </div>
        )}
      </section>
    </main>
  );
}