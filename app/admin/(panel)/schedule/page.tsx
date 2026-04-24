"use client";

import { useEffect, useState } from "react";

type ScheduleAppointment = {
  id: number;
  serviceId: number;
  startTime: string;
  endTime: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string | null;
  notes: string | null;
  status: string;
  service: {
    id: number;
    name: string;
    price: string;
    durationMinutes: number;
    active: boolean;
  };
};

function getStartOfWeek(date: Date) {
  const dayOfWeek = date.getDay();

  const startOfWeek = new Date(date);
  startOfWeek.setDate(date.getDate() - dayOfWeek);
  startOfWeek.setHours(0, 0, 0, 0);

  return startOfWeek;
}

function getWeekRange(date: Date) {
  const startOfWeek = getStartOfWeek(date);

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

function formatHour(hour: number) {
  if (hour === 0) return "12:00 AM";
  if (hour < 12) return `${hour}:00 AM`;
  if (hour === 12) return "12:00 PM";
  return `${hour - 12}:00 PM`;
}

function formatAppointmentTime(startTime: string, endTime: string) {
  const start = new Date(startTime);
  const end = new Date(endTime);

  const formattedStart = start.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  const formattedEnd = end.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  return `${formattedStart} - ${formattedEnd}`;
}

function getMockAppointments(currentDate: Date): ScheduleAppointment[] {
  const startOfWeek = getStartOfWeek(currentDate);

  const monday = new Date(startOfWeek);
  monday.setDate(startOfWeek.getDate() + 1);
  monday.setHours(10, 0, 0, 0);

  const mondayEnd = new Date(monday);
  mondayEnd.setMinutes(monday.getMinutes() + 30);

  const wednesday = new Date(startOfWeek);
  wednesday.setDate(startOfWeek.getDate() + 3);
  wednesday.setHours(14, 0, 0, 0);

  const wednesdayEnd = new Date(wednesday);
  wednesdayEnd.setHours(wednesday.getHours() + 1);

  const friday = new Date(startOfWeek);
  friday.setDate(startOfWeek.getDate() + 5);
  friday.setHours(16, 0, 0, 0);

  const fridayEnd = new Date(friday);
  fridayEnd.setMinutes(friday.getMinutes() + 45);

  return [
    {
      id: 1,
      serviceId: 1,
      startTime: monday.toISOString(),
      endTime: mondayEnd.toISOString(),
      customerName: "Test Customer",
      customerPhone: "555-555-5555",
      customerEmail: null,
      notes: null,
      status: "pending",
      service: {
        id: 1,
        name: "Eyebrow Threading",
        price: "20.00",
        durationMinutes: 30,
        active: true,
      },
    },
    {
      id: 2,
      serviceId: 2,
      startTime: wednesday.toISOString(),
      endTime: wednesdayEnd.toISOString(),
      customerName: "Test Customer 2",
      customerPhone: "555-555-5555",
      customerEmail: "test@example.com",
      notes: null,
      status: "confirmed",
      service: {
        id: 2,
        name: "Lash Lift",
        price: "50.00",
        durationMinutes: 60,
        active: true,
      },
    },
    {
      id: 3,
      serviceId: 3,
      startTime: friday.toISOString(),
      endTime: fridayEnd.toISOString(),
      customerName: "Test Customer 3",
      customerPhone: "555-555-5555",
      customerEmail: "test3@example.com",
      notes: null,
      status: "confirmed",
      service: {
        id: 3,
        name: "Brow Tint",
        price: "30.00",
        durationMinutes: 45,
        active: true,
      },
    },
  ];
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

const timeLabels = Array.from({ length: 24 }, (_, hour) => formatHour(hour));

export default function AdminSchedulePage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [appointments, setAppointments] = useState<ScheduleAppointment[]>([]);
  const [appointmentsError, setAppointmentsError] = useState<string | null>(
    null
  );

  const currentWeekRange = getWeekRange(currentDate);

  useEffect(() => {
    async function fetchAppointments() {
      const startOfWeek = getStartOfWeek(currentDate);

      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 7);

      try {
        const response = await fetch(
          `/api/admin/appointments?start=${startOfWeek.toISOString()}&end=${endOfWeek.toISOString()}`
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

          This is only here because the backend/database schema is not fully synced yet.
          It lets us test that appointments appear in the correct day and time slots.

          AFTER THE BACKEND IS WORKING:
          1. Remove these two lines:
             setAppointments(getMockAppointments(currentDate));
             setAppointmentsError("Using mock appointments until backend is ready.");

          2. Uncomment the two lines below:
             setAppointments([]);
             setAppointmentsError("Appointments could not be loaded.");
        */

        setAppointments(getMockAppointments(currentDate));
        setAppointmentsError("Using mock appointments until backend is ready.");

        // setAppointments([]);
        // setAppointmentsError("Appointments could not be loaded.");
      }
    }

    fetchAppointments();
  }, [currentDate]);

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

  function getAppointmentsForSlot(dayIndex: number, hourIndex: number) {
    return appointments.filter((appointment) => {
      const appointmentStart = new Date(appointment.startTime);

      return (
        appointmentStart.getDay() === dayIndex &&
        appointmentStart.getHours() === hourIndex
      );
    });
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

        <div className="mt-6 grid grid-cols-[minmax(50px,0.6fr)_repeat(7,1fr)] pb-3 text-center text-sm font-medium text-gray-700 sm:text-base">
          <div />
          {weekDays.map((day) => (
            <div key={day} className="min-w-0">
              <span className="block truncate">{day}</span>
            </div>
          ))}
        </div>

        <div className="schedule-scroll mt-4 max-h-[650px] overflow-y-auto">
          <div className="grid grid-cols-[minmax(50px,0.6fr)_repeat(7,1fr)]">
            {timeLabels.map((time, rowIndex) => {
              const isLastRow = rowIndex === timeLabels.length - 1;

              return (
                <div key={time} className="contents">
                  <div className="flex h-[clamp(56px,8vh,96px)] items-center justify-center pr-1 text-[10px] text-gray-700 sm:pr-3 sm:text-sm">
                    {time}
                  </div>

                  {weekDays.map((day, dayIndex) => {
                    const slotAppointments = getAppointmentsForSlot(
                      dayIndex,
                      rowIndex
                    );

                    return (
                      <div
                        key={`${day}-${time}`}
                        className={`h-[clamp(56px,8vh,96px)] border-l border-gray-200 p-1 ${
                          !isLastRow ? "border-b border-gray-200" : ""
                        } ${day === "Sunday" ? "border-l-0" : ""}`}
                      >
                        {slotAppointments.map((appointment) => (
                          <button
                            key={appointment.id}
                            type="button"
                            className="mb-1 w-full rounded-md bg-gray-100 px-2 py-1 text-left text-[10px] text-gray-700 hover:bg-gray-200 sm:text-xs"
                          >
                            <span className="block truncate font-medium">
                              {appointment.service.name}
                            </span>
                            <span className="block truncate">
                              {formatAppointmentTime(
                                appointment.startTime,
                                appointment.endTime
                              )}
                            </span>
                          </button>
                        ))}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </main>
  );
}