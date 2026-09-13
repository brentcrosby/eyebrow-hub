import { z } from "zod";

const businessHourSchema = z
  .object({
    dayOfWeek: z.number().int().min(0).max(6),
    enabled: z.boolean(),
    openMinutes: z.number().int().min(0).max(1439),
    closeMinutes: z.number().int().min(1).max(1440),
  })
  .superRefine((hours, context) => {
    if (
      hours.openMinutes % 60 !== 0 ||
      hours.closeMinutes % 60 !== 0
    ) {
      context.addIssue({
        code: "custom",
        message:
          "Opening and closing times must be on the hour",
      });
    }

    if (
      hours.enabled &&
      hours.openMinutes >= hours.closeMinutes
    ) {
      context.addIssue({
        code: "custom",
        message:
          "Opening time must be before closing time for enabled days",
      });
    }
  });

export const availabilitySettingsSchema = z
  .object({
    businessHours: z
      .array(businessHourSchema)
      .length(
        7,
        "Business hours must contain all seven weekdays"
      ),
    schedulingRule: z.object({
      minimumNoticeMinutes: z
        .number()
        .int()
        .min(
          0,
          "Minimum notice must be non-negative minutes"
        ),
      maximumAdvanceDays: z
        .number()
        .int()
        .min(
          1,
          "Maximum advance booking must be at least one day"
        ),
      bufferMinutes: z
        .number()
        .int()
        .min(
          0,
          "Buffer time must be non-negative minutes"
        ),
    }),
  })
  .superRefine((settings, context) => {
    const uniqueDays = new Set(
      settings.businessHours.map(
        (hours) => hours.dayOfWeek
      )
    );

    if (uniqueDays.size !== 7) {
      context.addIssue({
        code: "custom",
        path: ["businessHours"],
        message:
          "Each weekday must appear exactly once",
      });
    }
  });

export type AvailabilitySettingsInput = z.infer<
  typeof availabilitySettingsSchema
>;