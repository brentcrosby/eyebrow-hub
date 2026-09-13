import { describe, it, expect } from "vitest";
import {
  formatHourLabel,
  toTimeInputValue,
  DAY_NAMES,
  SHORT_DAY_NAMES,
} from "@/lib/businessHours";

describe("businessHours - formatHourLabel", () => {
  it("should format midnight correctly", () => {
    expect(formatHourLabel(0)).toBe("12:00 AM");
  });

  it("should format early morning hours correctly", () => {
    expect(formatHourLabel(1)).toBe("1:00 AM");
    expect(formatHourLabel(6)).toBe("6:00 AM");
    expect(formatHourLabel(11)).toBe("11:00 AM");
  });

  it("should format noon correctly", () => {
    expect(formatHourLabel(12)).toBe("12:00 PM");
  });

  it("should format afternoon hours correctly", () => {
    expect(formatHourLabel(13)).toBe("1:00 PM");
    expect(formatHourLabel(17)).toBe("5:00 PM");
    expect(formatHourLabel(18)).toBe("6:00 PM");
  });

  it("should format evening hours correctly", () => {
    expect(formatHourLabel(19)).toBe("7:00 PM");
    expect(formatHourLabel(20)).toBe("8:00 PM");
    expect(formatHourLabel(23)).toBe("11:00 PM");
  });

  it("should handle all 24 hours", () => {
    for (let hour = 0; hour < 24; hour++) {
      const formatted = formatHourLabel(hour);
      expect(formatted).toMatch(/^\d{1,2}:\d{2}\s(?:AM|PM)$/);
    }
  });
});

describe("businessHours - toTimeInputValue", () => {
  it("should format hour to HH:00 format with leading zero", () => {
    expect(toTimeInputValue(0)).toBe("00:00");
    expect(toTimeInputValue(1)).toBe("01:00");
    expect(toTimeInputValue(9)).toBe("09:00");
    expect(toTimeInputValue(10)).toBe("10:00");
  });

  it("should format afternoon and evening hours correctly", () => {
    expect(toTimeInputValue(12)).toBe("12:00");
    expect(toTimeInputValue(14)).toBe("14:00");
    expect(toTimeInputValue(17)).toBe("17:00");
    expect(toTimeInputValue(20)).toBe("20:00");
    expect(toTimeInputValue(23)).toBe("23:00");
  });

  it("should use 24-hour format", () => {
    for (let hour = 0; hour < 24; hour++) {
      const formatted = toTimeInputValue(hour);
      expect(formatted).toMatch(/^\d{2}:00$/);
    }
  });
});

describe("businessHours - Constants", () => {
  it("should have correct day names", () => {
    expect(DAY_NAMES).toEqual([
      "Sunday",
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
    ]);
    expect(DAY_NAMES).toHaveLength(7);
  });

  it("should have correct short day names", () => {
    expect(SHORT_DAY_NAMES).toEqual([
      "Sun",
      "Mon",
      "Tue",
      "Wed",
      "Thu",
      "Fri",
      "Sat",
    ]);
    expect(SHORT_DAY_NAMES).toHaveLength(7);
  });

  it("should have matching day name counts", () => {
    expect(DAY_NAMES.length).toBe(SHORT_DAY_NAMES.length);
    expect(DAY_NAMES.length).toBe(7);
  });
});

describe("businessHours - Round-trip conversion", () => {
  it("should convert to input value and back correctly", () => {
    for (let hour = 0; hour < 24; hour++) {
      const timeInputValue = toTimeInputValue(hour);
      const [hoursStr] = timeInputValue.split(":");
      const parsedHour = parseInt(hoursStr, 10);

      expect(parsedHour).toBe(hour);
    }
  });

  it("should maintain consistent formatting", () => {
    const hour = 14;
    const formatted = toTimeInputValue(hour);

    expect(formatted).toBe("14:00");
    expect(formatted.split(":")[0].length).toBe(2);
    expect(formatted.split(":")[1]).toBe("00");
  });
});
