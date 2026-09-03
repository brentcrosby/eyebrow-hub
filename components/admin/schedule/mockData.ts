// TEMPORARY MOCK DATA — scheduled for deletion in DT-467.
//
// The database has no appointment or availability-block seed data, so the
// schedule page falls back to these so the grid can be exercised by hand.
// DT-467 seeds real demo rows and deletes this file along with the fallbacks
// in the schedule page.

import { startOfWeek } from "@/lib/dateUtils";
import type { AvailabilityBlock, ScheduleAppointment } from "./types";

export function getMockAppointments(currentDate: Date): ScheduleAppointment[] {
  const weekStart = startOfWeek(currentDate);

  const monday = new Date(weekStart);
  monday.setDate(weekStart.getDate() + 1);
  monday.setHours(10, 0, 0, 0);

  const mondayEnd = new Date(monday);
  mondayEnd.setMinutes(monday.getMinutes() + 30);

  const wednesday = new Date(weekStart);
  wednesday.setDate(weekStart.getDate() + 3);
  wednesday.setHours(14, 0, 0, 0);

  const wednesdayEnd = new Date(wednesday);
  wednesdayEnd.setHours(wednesday.getHours() + 1);

  const friday = new Date(weekStart);
  friday.setDate(weekStart.getDate() + 5);
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

export function getMockAvailabilityBlocks(
  currentDate: Date
): AvailabilityBlock[] {
  const weekStart = startOfWeek(currentDate);

  const tuesday = new Date(weekStart);
  tuesday.setDate(weekStart.getDate() + 2);
  tuesday.setHours(12, 0, 0, 0);

  const tuesdayEnd = new Date(tuesday);
  tuesdayEnd.setHours(tuesday.getHours() + 1);

  const thursday = new Date(weekStart);
  thursday.setDate(weekStart.getDate() + 4);
  thursday.setHours(9, 0, 0, 0);

  const thursdayEnd = new Date(thursday);
  thursdayEnd.setMinutes(thursday.getMinutes() + 30);

  return [
    {
      id: 1,
      startTime: tuesday.toISOString(),
      endTime: tuesdayEnd.toISOString(),
      reason: "Lunch break",
    },
    {
      id: 2,
      startTime: thursday.toISOString(),
      endTime: thursdayEnd.toISOString(),
      reason: "Unavailable",
    },
  ];
}
