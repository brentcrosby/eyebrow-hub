import { describe, it, expect } from "vitest";
import {
  bookingSelectionSchema,
  bookingRequestSchema,
} from "@/lib/validations/booking";
import { mockBookingRequest } from "../fixtures/appointments";

describe("bookingSelectionSchema", () => {
  it("should validate correct booking selection", () => {
    const validSelection = {
      serviceIds: [1, 2],
      stylistId: 1,
      date: "2025-03-15",
      time: "2:00 PM",
    };

    const result = bookingSelectionSchema.safeParse(validSelection);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data).toEqual(validSelection);
    }
  });

  it("should accept null stylistId for next available", () => {
    const validSelection = {
      serviceIds: [1],
      stylistId: null,
      date: "2025-03-15",
      time: "2:00 PM",
    };

    const result = bookingSelectionSchema.safeParse(validSelection);

    expect(result.success).toBe(true);
  });

  it("should require at least one service", () => {
    const invalidSelection = {
      serviceIds: [],
      stylistId: 1,
      date: "2025-03-15",
      time: "2:00 PM",
    };

    const result = bookingSelectionSchema.safeParse(invalidSelection);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.serviceIds).toBeDefined();
    }
  });

  it("should reject negative or zero service IDs", () => {
    const invalidSelection = {
      serviceIds: [0, -1],
      stylistId: 1,
      date: "2025-03-15",
      time: "2:00 PM",
    };

    const result = bookingSelectionSchema.safeParse(invalidSelection);

    expect(result.success).toBe(false);
  });

  it("should validate date format YYYY-MM-DD", () => {
    const validDates = [
      "2025-01-01",
      "2025-12-31",
      "2026-03-15",
      "2024-02-29",
    ];

    validDates.forEach((date) => {
      const selection = {
        serviceIds: [1],
        stylistId: 1,
        date,
        time: "2:00 PM",
      };

      const result = bookingSelectionSchema.safeParse(selection);

      expect(result.success).toBe(true);
    });
  });

  it("should reject invalid date formats", () => {
    const invalidDates = [
      "2025/03/15",
      "15-03-2025",
      "03-15-2025",
      "2025-3-15",
      "2025-03-5",
      "invalid",
    ];

    invalidDates.forEach((date) => {
      const selection = {
        serviceIds: [1],
        stylistId: 1,
        date,
        time: "2:00 PM",
      };

      const result = bookingSelectionSchema.safeParse(selection);

      expect(result.success).toBe(false);
    });
  });

  it("should validate time format H:MM AM/PM", () => {
    const validTimes = [
      "12:00 AM",
      "1:00 AM",
      "9:30 AM",
      "12:00 PM",
      "2:45 PM",
      "11:59 PM",
    ];

    validTimes.forEach((time) => {
      const selection = {
        serviceIds: [1],
        stylistId: 1,
        date: "2025-03-15",
        time,
      };

      const result = bookingSelectionSchema.safeParse(selection);

      expect(result.success).toBe(true);
    });
  });

  it("should reject invalid time formats", () => {
    const invalidTimes = [
      "2:00 pm",
      "02:00 PM",
      "14:00",
      "2:00PM",
      "14:00:00",
      "invalid",
      "25:00 PM",
      "2:60 PM",
    ];

    invalidTimes.forEach((time) => {
      const selection = {
        serviceIds: [1],
        stylistId: 1,
        date: "2025-03-15",
        time,
      };

      const result = bookingSelectionSchema.safeParse(selection);

      expect(result.success).toBe(false);
    });
  });
});

describe("bookingRequestSchema", () => {
  it("should validate correct booking request", () => {
    const result = bookingRequestSchema.safeParse(mockBookingRequest);

    expect(result.success).toBe(true);
  });

  it("should extend bookingSelectionSchema with contact info", () => {
    const withContactInfo = {
      ...mockBookingRequest,
      name: "Jane Doe",
      email: "jane@example.com",
      phone: "5550987654",
    };

    const result = bookingRequestSchema.safeParse(withContactInfo);

    expect(result.success).toBe(true);
  });

  it("should require name", () => {
    const missingName = {
      ...mockBookingRequest,
      name: "",
    };

    const result = bookingRequestSchema.safeParse(missingName);

    expect(result.success).toBe(false);
  });

  it("should trim whitespace from name", () => {
    const withWhitespace = {
      ...mockBookingRequest,
      name: "  John Doe  ",
    };

    const result = bookingRequestSchema.safeParse(withWhitespace);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe("John Doe");
    }
  });

  it("should require valid email", () => {
    const invalidEmails = [
      "not-an-email",
      "missing@domain",
      "@nodomain.com",
      "spaces in@email.com",
      "",
    ];

    invalidEmails.forEach((email) => {
      const request = {
        ...mockBookingRequest,
        email,
      };

      const result = bookingRequestSchema.safeParse(request);

      expect(result.success).toBe(false);
    });
  });

  it("should accept valid emails", () => {
    const validEmails = [
      "user@example.com",
      "user.name@example.co.uk",
      "user+tag@example.com",
      "user123@subdomain.example.com",
    ];

    validEmails.forEach((email) => {
      const request = {
        ...mockBookingRequest,
        email,
      };

      const result = bookingRequestSchema.safeParse(request);

      expect(result.success).toBe(true);
    });
  });

  it("should require exactly 10-digit phone number", () => {
    const invalidPhones = [
      "555-01",
      "555-01234",
      "555012345",
      "(555) 0123456",
      "1-555-0123456",
      "abc",
      "",
    ];

    invalidPhones.forEach((phone) => {
      const request = {
        ...mockBookingRequest,
        phone,
      };

      const result = bookingRequestSchema.safeParse(request);

      expect(result.success).toBe(false);
    });
  });

  it("should accept 10-digit phone in various formats", () => {
    const validPhones = [
      "5550123456",
      "555-0123456",
      "(555) 0123456",
      "555.0123456",
      "555 0123456",
    ];

    validPhones.forEach((phone) => {
      const request = {
        ...mockBookingRequest,
        phone,
      };

      const result = bookingRequestSchema.safeParse(request);

      expect(result.success).toBe(true);
    });
  });

  it("should trim whitespace from email and phone", () => {
    const request = {
      ...mockBookingRequest,
      email: "  user@example.com  ",
      phone: "  555-0123456  ",
    };

    const result = bookingRequestSchema.safeParse(request);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("user@example.com");
      expect(result.data.phone).toBe("5550123456");
    }
  });
});
