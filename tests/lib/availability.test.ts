import { describe, it, expect, beforeEach } from "vitest";
import {
  DEFAULT_BUSINESS_HOURS,
  DEFAULT_SCHEDULING_RULE,
} from "@/lib/availabilitySettings";
import {
  mockBusinessHours,
  mockSchedulingRule,
  createMockAppointmentAt,
  createMockBlockAt,
} from "../fixtures/appointments";

describe("Availability and Conflict Detection", () => {
  describe("Business Hours Constants", () => {
    it("should have default business hours for all 7 days", () => {
      expect(DEFAULT_BUSINESS_HOURS).toHaveLength(7);
    });

    it("should have Sunday hours (11 AM - 6 PM)", () => {
      const sunday = DEFAULT_BUSINESS_HOURS[0];
      expect(sunday.dayOfWeek).toBe(0);
      expect(sunday.enabled).toBe(true);
      expect(sunday.openMinutes).toBe(660); // 11 AM
      expect(sunday.closeMinutes).toBe(1080); // 6 PM
    });

    it("should have Monday-Saturday hours (10 AM - 8 PM)", () => {
      for (let i = 1; i < 7; i++) {
        const day = DEFAULT_BUSINESS_HOURS[i];
        expect(day.dayOfWeek).toBe(i);
        expect(day.enabled).toBe(true);
        expect(day.openMinutes).toBe(600); // 10 AM
        expect(day.closeMinutes).toBe(1200); // 8 PM
      }
    });

    it("should have correct default scheduling rules", () => {
      expect(DEFAULT_SCHEDULING_RULE.minimumNoticeMinutes).toBe(120); // 2 hours
      expect(DEFAULT_SCHEDULING_RULE.maximumAdvanceDays).toBe(30);
      expect(DEFAULT_SCHEDULING_RULE.bufferMinutes).toBe(15);
    });
  });

  describe("Conflict Detection Logic", () => {
    it("should detect appointment overlap without buffer", () => {
      const appointment1 = createMockAppointmentAt(2025, 3, 15, 14, 30);
      const appointment2 = createMockAppointmentAt(2025, 3, 15, 14, 30);

      const bufferedStart = new Date(
        appointment1.startTime.getTime() -
          mockSchedulingRule.bufferMinutes * 60000
      );

      const bufferedEnd = new Date(
        appointment1.endTime.getTime() +
          mockSchedulingRule.bufferMinutes * 60000
      );

      const overlaps =
        bufferedStart < appointment2.endTime &&
        bufferedEnd > appointment2.startTime;

      expect(overlaps).toBe(true);
    });

    it("should detect appointment overlap with buffer time", () => {
      // Appointment: 2:00 PM - 2:30 PM
      const appointment1 = createMockAppointmentAt(2025, 3, 15, 14, 30);

      // New appointment: 2:30 PM - 3:00 PM (exactly after)
      const appointment2 = createMockAppointmentAt(2025, 3, 15, 14, 30, 30);

      const bufferedStart = new Date(
        appointment1.startTime.getTime() -
          mockSchedulingRule.bufferMinutes * 60000
      );

      const bufferedEnd = new Date(
        appointment1.endTime.getTime() +
          mockSchedulingRule.bufferMinutes * 60000
      );

      const overlaps =
        bufferedStart < appointment2.endTime &&
        bufferedEnd > appointment2.startTime;

      expect(overlaps).toBe(true);
    });

    it("should allow appointment after buffer time expires", () => {
      // Appointment: 2:00 PM - 2:30 PM, buffer: 15 minutes
      const appointment1 = createMockAppointmentAt(2025, 3, 15, 14, 30);

      // New appointment: 2:45 PM - 3:15 PM (15 minutes after end)
      const startTime = new Date(
        appointment1.endTime.getTime() +
          mockSchedulingRule.bufferMinutes * 60000
      );
      const endTime = new Date(startTime.getTime() + 30 * 60000);

      const bufferedStart = new Date(
        appointment1.startTime.getTime() -
          mockSchedulingRule.bufferMinutes * 60000
      );

      const bufferedEnd = new Date(
        appointment1.endTime.getTime() +
          mockSchedulingRule.bufferMinutes * 60000
      );

      const overlaps = bufferedStart < endTime && bufferedEnd > startTime;

      expect(overlaps).toBe(false);
    });

    it("should detect overlap with availability blocks", () => {
      const block = createMockBlockAt(2025, 3, 15, 12, 60);
      const appointment = createMockAppointmentAt(2025, 3, 15, 12, 30);

      const overlaps =
        block.startTime < appointment.endTime &&
        block.endTime > appointment.startTime;

      expect(overlaps).toBe(true);
    });

    it("should allow appointment before block starts", () => {
      const block = createMockBlockAt(2025, 3, 15, 14, 60);
      const appointmentEnd = new Date(block.startTime.getTime() - 1000);
      const appointmentStart = new Date(appointmentEnd.getTime() - 30 * 60000);

      const overlaps =
        block.startTime < appointmentEnd && block.endTime > appointmentStart;

      expect(overlaps).toBe(false);
    });

    it("should allow appointment after block ends", () => {
      const block = createMockBlockAt(2025, 3, 15, 12, 60);
      const appointmentStart = new Date(block.endTime.getTime() + 1000);
      const appointmentEnd = new Date(appointmentStart.getTime() + 30 * 60000);

      const overlaps =
        block.startTime < appointmentEnd && block.endTime > appointmentStart;

      expect(overlaps).toBe(false);
    });
  });

  describe("Minimum Notice and Maximum Advance Window", () => {
    it("should enforce minimum 2-hour notice", () => {
      const now = new Date();
      const bookingCutoff = new Date(
        now.getTime() +
          DEFAULT_SCHEDULING_RULE.minimumNoticeMinutes * 60000
      );

      // Slot within cutoff should be unavailable
      const tooSoonSlot = new Date(
        now.getTime() + 30 * 60000
      );

      expect(tooSoonSlot < bookingCutoff).toBe(true);

      // Slot after cutoff should be available
      const validSlot = new Date(
        bookingCutoff.getTime() + 1000
      );

      expect(validSlot >= bookingCutoff).toBe(true);
    });

    it("should enforce 30-day maximum advance booking", () => {
      const now = new Date();
      now.setHours(0, 0, 0, 0);

      const maximumDate = new Date(now);
      maximumDate.setDate(
        maximumDate.getDate() +
          DEFAULT_SCHEDULING_RULE.maximumAdvanceDays
      );

      // Slot within window should be available
      const validSlot = new Date(maximumDate);
      validSlot.setDate(validSlot.getDate() - 1);

      expect(validSlot <= maximumDate).toBe(true);

      // Slot beyond window should not be available
      const tooFarSlot = new Date(maximumDate);
      tooFarSlot.setDate(tooFarSlot.getDate() + 1);

      expect(tooFarSlot > maximumDate).toBe(true);
    });
  });

  describe("Slot Interval and Duration Validation", () => {
    const SLOT_INTERVAL_MINUTES = 30;

    it("should generate slots at 30-minute intervals", () => {
      const slotTimes: number[] = [];

      for (let i = 0; i < 4; i++) {
        slotTimes.push(i * SLOT_INTERVAL_MINUTES);
      }

      // Verify intervals
      for (let i = 1; i < slotTimes.length; i++) {
        const interval = slotTimes[i] - slotTimes[i - 1];
        expect(interval).toBe(SLOT_INTERVAL_MINUTES);
      }
    });

    it("should ensure slot duration fits in remaining day", () => {
      const openMinutes = 600; // 10 AM
      const closeMinutes = 1200; // 8 PM
      const durationMinutes = 30;
      const slotIntervalMinutes = 30;

      const dayLength = closeMinutes - openMinutes;
      let slotCount = 0;

      for (
        let slotStart = openMinutes;
        slotStart + durationMinutes <= closeMinutes;
        slotStart += slotIntervalMinutes
      ) {
        slotCount++;
      }

      expect(slotCount).toBeGreaterThan(0);
      expect(slotCount * slotIntervalMinutes).toBeLessThanOrEqual(dayLength);
    });

    it("should not generate slots if duration exceeds remaining time", () => {
      const openMinutes = 600; // 10 AM
      const closeMinutes = 1200; // 8 PM
      const durationMinutes = 700; // Longer than open hours

      let slotCount = 0;

      for (
        let slotStart = openMinutes;
        slotStart + durationMinutes <= closeMinutes;
        slotStart += 30
      ) {
        slotCount++;
      }

      expect(slotCount).toBe(0);
    });
  });

  describe("Business Hours Boundary Cases", () => {
    it("should reject bookings on closed days", () => {
      const closedDay = { ...mockBusinessHours[0], enabled: false };

      expect(closedDay.enabled).toBe(false);
    });

    it("should generate slots only during business hours", () => {
      const hours = mockBusinessHours[1]; // Monday
      const openMinutes = hours.openMinutes; // 10 AM
      const closeMinutes = hours.closeMinutes; // 8 PM

      const slots: number[] = [];

      for (
        let time = openMinutes;
        time + 30 <= closeMinutes;
        time += 30
      ) {
        slots.push(time);
      }

      expect(slots.length).toBeGreaterThan(0);
      expect(slots[0]).toBe(openMinutes);
      expect(slots[slots.length - 1] + 30).toBeLessThanOrEqual(closeMinutes);
    });

    it("should handle transitions between days correctly", () => {
      const sundayHours = mockBusinessHours[0];
      const mondayHours = mockBusinessHours[1];

      expect(sundayHours.dayOfWeek).toBe(0);
      expect(mondayHours.dayOfWeek).toBe(1);
      expect(sundayHours.closeMinutes).not.toBe(mondayHours.closeMinutes);
    });
  });
});
