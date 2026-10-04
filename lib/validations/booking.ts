import { z } from "zod";

export const BOOKING_LIMITS = {
  services: 4,
  name: 100,
  email: 254,
  phone: 32,
  notes: 500,
} as const;

export const bookingSelectionSchema = z.object({
  serviceIds: z
    .array(z.number().int().positive())
    .min(1, "At least one service is required")
    .max(
      BOOKING_LIMITS.services,
      `Select up to ${BOOKING_LIMITS.services} services`
    )
    .refine(
      (ids) => new Set(ids).size === ids.length,
      "Select each service only once"
    ),
  stylistId: z.number().int().positive().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  time: z.string().regex(/^\d{1,2}:\d{2}\s(AM|PM)$/, "Time must be H:MM AM/PM"),
});

export const bookingContactSchemas = {
  name: z
    .string()
    .max(
      BOOKING_LIMITS.name,
      `Name must be ${BOOKING_LIMITS.name} characters or fewer`
    )
    .trim()
    .min(1, "Name is required"),
  email: z
    .string()
    .max(
      BOOKING_LIMITS.email,
      `Email must be ${BOOKING_LIMITS.email} characters or fewer`
    )
    .trim()
    .email("Enter a valid email address"),
  phone: z
    .string()
    .max(
      BOOKING_LIMITS.phone,
      `Phone must be ${BOOKING_LIMITS.phone} characters or fewer`
    )
    .trim()
    .refine((phone) => phone.replace(/\D/g, "").length === 10, {
      message: "Enter a 10-digit phone number",
    }),
  notes: z
    .string()
    .max(
      BOOKING_LIMITS.notes,
      `Notes must be ${BOOKING_LIMITS.notes} characters or fewer`
    )
    .trim()
    .optional()
    .transform((notes) => notes || undefined),
};

export const bookingRequestSchema = bookingSelectionSchema.extend(
  bookingContactSchemas
);

export type BookingSelection = z.infer<typeof bookingSelectionSchema>;
export type BookingRequest = z.infer<typeof bookingRequestSchema>;
