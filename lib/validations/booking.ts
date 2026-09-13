import { z } from "zod";

export const bookingSelectionSchema = z.object({
  serviceIds: z
    .array(z.number().int().positive())
    .min(1, "At least one service is required"),
  stylistId: z.number().int().positive().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  time: z.string().regex(/^\d{1,2}:\d{2}\s(AM|PM)$/, "Time must be H:MM AM/PM"),
});

export const bookingRequestSchema = bookingSelectionSchema.extend({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email("Enter a valid email address"),
  phone: z
    .string()
    .trim()
    .refine((phone) => phone.replace(/\D/g, "").length === 10, {
      message: "Enter a 10-digit phone number",
    }),
});

export type BookingSelection = z.infer<typeof bookingSelectionSchema>;
export type BookingRequest = z.infer<typeof bookingRequestSchema>;
