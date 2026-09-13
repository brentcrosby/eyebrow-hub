import { z } from "zod";
import {
  PENDING_STATUS,
  CONFIRMED_STATUS,
  COMPLETED_STATUS,
  CANCELLED_STATUS,
} from "@/lib/appointmentStatus";

// Validates a staff-entered phone/walk-in booking. Single service per
// appointment, unlike the customer flow's serviceIds array — a manual entry
// is one appointment at a time.
export const manualAppointmentSchema = z.object({
  serviceId: z.number().int().positive(),
  stylistId: z.number().int().positive().nullable().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  time: z.string().regex(/^\d{1,2}:\d{2}\s(AM|PM)$/, "Time must be H:MM AM/PM"),
  customerName: z.string().trim().min(1, "Name is required"),
  customerPhone: z
    .string()
    .trim()
    .refine((phone) => phone.replace(/\D/g, "").length === 10, {
      message: "Enter a 10-digit phone number",
    }),
  customerEmail: z
    .string()
    .trim()
    .email("Enter a valid email address")
    .optional()
    .nullable(),
  notes: z.string().trim().optional().nullable(),
  // Staff are entering an already-decided booking, so it defaults to
  // confirmed rather than pending (which is for the customer-facing flow
  // awaiting approval).
  status: z
    .enum([PENDING_STATUS, CONFIRMED_STATUS, COMPLETED_STATUS, CANCELLED_STATUS])
    .default(CONFIRMED_STATUS),
});

export type ManualAppointmentInput = z.infer<typeof manualAppointmentSchema>;
