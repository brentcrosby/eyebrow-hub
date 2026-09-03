"use client";

import { DAY_NAMES, formatHourLabel } from "@/lib/businessHours";
import { formatTimeRange } from "@/lib/dateUtils";
import type { AvailabilityBlock, ScheduleAppointment } from "./types";

const timeLabels = Array.from({ length: 24 }, (_, hour) =>
  formatHourLabel(hour)
);

type WeekScheduleGridProps = {
  appointments: ScheduleAppointment[];
  availabilityBlocks: AvailabilityBlock[];
};

export default function WeekScheduleGrid({
  appointments,
  availabilityBlocks,
}: WeekScheduleGridProps) {
  function getAppointmentsForSlot(dayIndex: number, hourIndex: number) {
    return appointments.filter((appointment) => {
      const appointmentStart = new Date(appointment.startTime);

      return (
        appointmentStart.getDay() === dayIndex &&
        appointmentStart.getHours() === hourIndex
      );
    });
  }

  function getAvailabilityBlocksForSlot(dayIndex: number, hourIndex: number) {
    return availabilityBlocks.filter((block) => {
      const blockStart = new Date(block.startTime);

      return (
        blockStart.getDay() === dayIndex && blockStart.getHours() === hourIndex
      );
    });
  }

  return (
    <>
      <div className="mt-6 grid grid-cols-[minmax(50px,0.6fr)_repeat(7,1fr)] pb-3 text-center text-sm font-medium text-gray-700 sm:text-base">
        <div />
        {DAY_NAMES.map((day) => (
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

                {DAY_NAMES.map((day, dayIndex) => {
                  const slotAppointments = getAppointmentsForSlot(
                    dayIndex,
                    rowIndex
                  );

                  const slotAvailabilityBlocks = getAvailabilityBlocksForSlot(
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
                      {slotAvailabilityBlocks.map((block) => (
                        <div
                          key={block.id}
                          className="mb-1 w-full rounded-md bg-gray-200 px-2 py-1 text-left text-[10px] text-gray-700 sm:text-xs"
                        >
                          <span className="block truncate font-medium">
                            Unavailable
                          </span>
                          <span className="block truncate">
                            {block.reason ?? "Blocked time"}
                          </span>
                          <span className="block truncate">
                            {formatTimeRange(
                              new Date(block.startTime),
                              new Date(block.endTime)
                            )}
                          </span>
                        </div>
                      ))}

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
                            {formatTimeRange(
                              new Date(appointment.startTime),
                              new Date(appointment.endTime)
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
    </>
  );
}
