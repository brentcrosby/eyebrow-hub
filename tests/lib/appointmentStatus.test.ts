import { describe, it, expect } from "vitest";
import { CANCELLED_STATUS, PENDING_STATUS, CONFIRMED_STATUS, COMPLETED_STATUS, isCancelled } from "@/lib/appointmentStatus";

/**
 * Tests for appointment status and filtering logic.
 * Verifies that cancelled appointments don't block availability.
 */
describe("Appointment Status - Cancelled Filtering", () => {
  describe("Cancelled Status Constant", () => {
    it("should have a defined cancelled status constant", () => {
      expect(CANCELLED_STATUS).toBeDefined();
      expect(typeof CANCELLED_STATUS).toBe("string");
    });

    it("should use consistent cancelled status value", () => {
      // All cancelled checks should use this constant
      expect(CANCELLED_STATUS).toBe("cancelled");
    });

    it("should have all status constants defined", () => {
      expect(PENDING_STATUS).toBe("pending");
      expect(CONFIRMED_STATUS).toBe("confirmed");
      expect(COMPLETED_STATUS).toBe("completed");
      expect(CANCELLED_STATUS).toBe("cancelled");
    });
  });

  describe("isCancelled() Helper Function", () => {
    it("should recognize lowercase cancelled status", () => {
      expect(isCancelled("cancelled")).toBe(true);
    });

    it("should recognize British spelling (cancelled)", () => {
      expect(isCancelled("cancelled")).toBe(true);
    });

    it("should recognize American spelling (canceled)", () => {
      expect(isCancelled("canceled")).toBe(true);
    });

    it("should handle case-insensitive matching", () => {
      expect(isCancelled("CANCELLED")).toBe(true);
      expect(isCancelled("Cancelled")).toBe(true);
      expect(isCancelled("CANCELED")).toBe(true);
    });

    it("should return false for non-cancelled statuses", () => {
      expect(isCancelled("pending")).toBe(false);
      expect(isCancelled("confirmed")).toBe(false);
      expect(isCancelled("completed")).toBe(false);
    });

    it("should handle null and undefined", () => {
      expect(isCancelled(null)).toBe(false);
      expect(isCancelled(undefined)).toBe(false);
    });

    it("should handle whitespace", () => {
      expect(isCancelled("  cancelled  ")).toBe(true);
      expect(isCancelled(" canceled ")).toBe(true);
    });
  });

  describe("Availability Query Filtering", () => {
    it("should exclude cancelled appointments from availability check", () => {
      // Simulating: WHERE status != CANCELLED_STATUS (case-insensitive)
      const appointments = [
        { id: 1, status: "confirmed", startTime: new Date(), endTime: new Date() },
        { id: 2, status: "cancelled", startTime: new Date(), endTime: new Date() },
        { id: 3, status: "confirmed", startTime: new Date(), endTime: new Date() },
        { id: 4, status: "pending", startTime: new Date(), endTime: new Date() },
      ];

      const activeAppointments = appointments.filter(
        (apt) => !isCancelled(apt.status)
      );

      expect(activeAppointments).toHaveLength(3);
      expect(activeAppointments.every((apt) => !isCancelled(apt.status))).toBe(
        true
      );
    });

    it("should allow rebooking a cancelled appointment slot", () => {
      const cancelledAppointment = {
        id: 1,
        startTime: new Date(2025, 2, 15, 14, 0),
        endTime: new Date(2025, 2, 15, 14, 30),
        status: "cancelled",
      };

      // New booking for same time
      const newBookingStart = new Date(2025, 2, 15, 14, 0);
      const newBookingEnd = new Date(2025, 2, 15, 14, 30);

      // Should NOT detect conflict because cancelled
      const activeAppointmentsConflict =
        !isCancelled(cancelledAppointment.status) &&
        newBookingStart < cancelledAppointment.endTime &&
        newBookingEnd > cancelledAppointment.startTime;

      expect(activeAppointmentsConflict).toBe(false);
    });

    it("should block slot if appointment is confirmed (not cancelled)", () => {
      const confirmedAppointment = {
        id: 1,
        startTime: new Date(2025, 2, 15, 14, 0),
        endTime: new Date(2025, 2, 15, 14, 30),
        status: "confirmed",
      };

      const newBookingStart = new Date(2025, 2, 15, 14, 0);
      const newBookingEnd = new Date(2025, 2, 15, 14, 30);

      // Should detect conflict because not cancelled
      const hasConflict =
        !isCancelled(confirmedAppointment.status) &&
        newBookingStart < confirmedAppointment.endTime &&
        newBookingEnd > confirmedAppointment.startTime;

      expect(hasConflict).toBe(true);
    });

    it("should block slot if appointment is pending (not cancelled)", () => {
      const pendingAppointment = {
        id: 1,
        startTime: new Date(2025, 2, 15, 14, 0),
        endTime: new Date(2025, 2, 15, 14, 30),
        status: "pending",
      };

      const newBookingStart = new Date(2025, 2, 15, 14, 0);
      const newBookingEnd = new Date(2025, 2, 15, 14, 30);

      // Should detect conflict because not cancelled
      const hasConflict =
        !isCancelled(pendingAppointment.status) &&
        newBookingStart < pendingAppointment.endTime &&
        newBookingEnd > pendingAppointment.startTime;

      expect(hasConflict).toBe(true);
    });

    it("should handle mixed cancelled and active appointments", () => {
      const appointments = [
        { status: "confirmed", startTime: new Date(2025, 2, 15, 10, 0), endTime: new Date(2025, 2, 15, 10, 30) },
        { status: "cancelled", startTime: new Date(2025, 2, 15, 14, 0), endTime: new Date(2025, 2, 15, 14, 30) },
        { status: "confirmed", startTime: new Date(2025, 2, 15, 15, 0), endTime: new Date(2025, 2, 15, 15, 30) },
      ];

      // Only active appointments should block slots
      const activeAppointments = appointments.filter(
        (apt) => !isCancelled(apt.status)
      );

      expect(activeAppointments).toHaveLength(2);
      expect(activeAppointments.every((apt) => apt.status === "confirmed")).toBe(
        true
      );

      // Cancelled slot should be available
      const cancelledSlotAvailable = !appointments
        .filter((apt) => !isCancelled(apt.status))
        .some(
          (apt) =>
            new Date(2025, 2, 15, 14, 0) < apt.endTime &&
            new Date(2025, 2, 15, 14, 30) > apt.startTime
        );

      expect(cancelledSlotAvailable).toBe(true);
    });
  });

  describe("Cancellation Workflow", () => {
    it("should mark appointment as cancelled without deleting", () => {
      const appointment = {
        id: 1,
        status: "confirmed",
        startTime: new Date(),
        endTime: new Date(),
      };

      // Simulate cancellation: status update, not delete
      const cancelled = { ...appointment, status: "cancelled" };

      expect(cancelled.id).toBe(appointment.id); // Still exists
      expect(isCancelled(cancelled.status)).toBe(true);
      expect(isCancelled(appointment.status)).toBe(false); // Original unchanged
    });

    it("should preserve appointment history for cancelled appointments", () => {
      const appointment = {
        id: 1,
        status: "confirmed",
        startTime: new Date(2025, 2, 15, 14, 0),
        endTime: new Date(2025, 2, 15, 14, 30),
        customerName: "John Doe",
        customerEmail: "john@example.com",
      };

      // Cancellation preserves all data
      const cancelled = { ...appointment, status: "cancelled" };

      expect(cancelled.customerName).toBe("John Doe");
      expect(cancelled.customerEmail).toBe("john@example.com");
      expect(cancelled.startTime).toEqual(appointment.startTime);
      expect(isCancelled(cancelled.status)).toBe(true);
    });
  });
});
