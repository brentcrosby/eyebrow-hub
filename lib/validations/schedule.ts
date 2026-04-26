import { z } from "zod";

export const scheduleAppointmentStatusSchema = z.enum([
  "booked",
  "blocked",
  "empty",
]);

export const scheduleAppointmentSchema = z.object({
  time: z.string().min(1, "Time is required"),
  serviceName: z.string().min(1, "Service name is required").optional(),
  customerName: z.string().min(1, "Customer name is required").optional(),
  status: scheduleAppointmentStatusSchema,
});

export const todayScheduleResponseSchema = z.object({
  appointments: z.array(scheduleAppointmentSchema),
});

export type ScheduleAppointmentStatus = z.infer<
  typeof scheduleAppointmentStatusSchema
>;
export type ScheduleAppointment = z.infer<typeof scheduleAppointmentSchema>;
export type TodayScheduleResponse = z.infer<typeof todayScheduleResponseSchema>;
