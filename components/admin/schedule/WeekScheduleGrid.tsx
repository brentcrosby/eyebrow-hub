"use client";

import {
  DAY_NAMES,
  SHORT_DAY_NAMES,
  formatHourLabel,
} from "@/lib/businessHours";
import type { BusinessHoursDay } from "@/lib/businessHours";
import { addDays, formatTimeRange, isSameDay } from "@/lib/dateUtils";
import { getOpenSlots } from "@/lib/scheduleSlots";
import {
  getStatusAccentClasses,
  getStatusLabel,
} from "@/lib/appointmentStatus";
import type {
  AvailabilityBlock,
  ScheduleAppointment,
  ScheduleInteractionProps,
} from "./types";

const timeLabels = Array.from({ length: 24 }, (_, hour) =>
  formatHourLabel(hour)
);

type WeekScheduleGridProps = {
  weekStart: Date;
  appointments: ScheduleAppointment[];
  availabilityBlocks: AvailabilityBlock[];
  businessHours?: BusinessHoursDay[];
} & ScheduleInteractionProps;

export default function WeekScheduleGrid({
  weekStart,
  appointments,
  availabilityBlocks,
  businessHours,
  onSlotClick,
  onAppointmentClick,
}: WeekScheduleGridProps) {
  // Match on the actual calendar date, not just the weekday. Comparing getDay()
  // alone placed an item from any other week into the same column.
  function getAppointmentsForSlot(dayIndex: number, hourIndex: number) {
    const dayDate = addDays(weekStart, dayIndex);

    return appointments.filter((appointment) => {
      const appointmentStart = new Date(appointment.startTime);

      return (
        isSameDay(appointmentStart, dayDate) &&
        appointmentStart.getHours() === hourIndex
      );
    });
  }

  function getAvailabilityBlocksForSlot(dayIndex: number, hourIndex: number) {
    const dayDate = addDays(weekStart, dayIndex);

    return availabilityBlocks.filter((block) => {
      const blockStart = new Date(block.startTime);

      return (
        isSameDay(blockStart, dayDate) && blockStart.getHours() === hourIndex
      );
    });
  }

  return (
    <>
      {/* Seven columns cannot fit at 375px. The grid keeps a minimum width and
          scrolls inside this container, so the page itself never overflows. */}
      <div className="mt-6 overflow-x-auto">
        <div className="min-w-[700px]">
          <div className="grid grid-cols-[minmax(50px,0.6fr)_repeat(7,1fr)] pb-3 text-center text-sm font-medium text-gray-700 sm:text-base">
            <div />
            {DAY_NAMES.map((day, dayIndex) => (
              <div key={day} className="min-w-0">
                <span className="block truncate sm:hidden">
                  {SHORT_DAY_NAMES[dayIndex]}
                </span>
                <span className="hidden truncate sm:block">{day}</span>
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
                      const dayDate = addDays(weekStart, dayIndex);
                      const slotAppointments = getAppointmentsForSlot(
                        dayIndex,
                        rowIndex
                      );

                      const slotAvailabilityBlocks =
                        getAvailabilityBlocksForSlot(dayIndex, rowIndex);
                      const hours = businessHours?.find(
                        (entry) => entry.dayOfWeek === dayDate.getDay()
                      );
                      const selectableSlot =
                        onSlotClick &&
                        hours &&
                        !hours.closed &&
                        rowIndex >= hours.open &&
                        rowIndex + 1 <= hours.close
                          ? getOpenSlots({
                              dayStart: dayDate,
                              openHour: rowIndex,
                              closeHour: rowIndex + 1,
                              intervalMinutes: 60,
                              appointments,
                              blocks: availabilityBlocks,
                            })[0]
                          : undefined;

                      return (
                        <div
                          key={`${day}-${time}`}
                          className={`h-[clamp(56px,8vh,96px)] border-l border-gray-200 p-1 ${
                            !isLastRow ? "border-b border-gray-200" : ""
                          } ${day === "Sunday" ? "border-l-0" : ""}`}
                        >
                          {selectableSlot && (
                            <button
                              type="button"
                              data-slot-start={selectableSlot.start.toISOString()}
                              aria-label={`Book an appointment, ${selectableSlot.start.toLocaleDateString(
                                "en-US",
                                {
                                  weekday: "long",
                                  month: "long",
                                  day: "numeric",
                                }
                              )}, ${formatHourLabel(rowIndex)}`}
                              onClick={() => onSlotClick?.(selectableSlot)}
                              className="group flex h-full min-h-10 w-full items-center justify-center rounded-md border border-transparent bg-transparent text-[10px] font-medium text-[#7a5a3c] transition-colors hover:border-dashed hover:border-[#d8c4ae] hover:bg-[#f6e9db] focus-visible:border-dashed focus-visible:border-[#d8c4ae] focus-visible:bg-[#f6e9db] focus-visible:ring-2 focus-visible:ring-[#7a5a3c] focus-visible:outline-none active:bg-[#ead8c6] [@media(hover:none)]:after:content-['+'] sm:text-xs"
                            >
                              <span className="opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 [@media(hover:none)]:hidden">
                                + {formatHourLabel(rowIndex)}
                              </span>
                            </button>
                          )}

                          {slotAvailabilityBlocks.map((block) => (
                            <div
                              key={block.id}
                              className="mb-1 w-full rounded-md border-l-4 border-l-gray-400 bg-gray-200 px-2 py-1 text-left text-[10px] text-gray-700 sm:text-xs"
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
                              onClick={
                                onAppointmentClick
                                  ? () => onAppointmentClick(appointment)
                                  : undefined
                              }
                              data-appointment-id={appointment.id}
                              aria-label={`${appointment.service.name}, ${formatTimeRange(
                                new Date(appointment.startTime),
                                new Date(appointment.endTime)
                              )}, ${getStatusLabel(appointment.status)}, ${
                                appointment.customerName
                              }`}
                              className={`mb-1 w-full rounded-md border-l-4 bg-gray-100 px-2 py-1 text-left text-[10px] text-gray-700 hover:bg-gray-200 focus-visible:ring-2 focus-visible:ring-gray-500 focus-visible:outline-none sm:text-xs ${getStatusAccentClasses(
                                appointment.status
                              )}`}
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
        </div>
      </div>
    </>
  );
}
