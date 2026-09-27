import { z } from "zod";

const positiveDecimalString = z
  .string()
  .trim()
  .regex(/^\d+(?:\.\d+)?$/, "Price must be a valid number")
  .refine((value) => Number(value) > 0, "Price must be positive");

const serviceFields = {
  name: z.string().trim().min(1, "Name is required"),
  price: z
    .union([
      z.number().finite().positive("Price must be positive"),
      positiveDecimalString,
    ])
    .transform((value) => value.toString()),
  durationMinutes: z
    .number()
    .int("Duration must be a whole number of minutes")
    .positive("Duration must be positive"),
  active: z.boolean().optional().default(true),
};

export const createServiceSchema = z.object(serviceFields).strict();

export const updateServiceSchema = z
  .object({
    id: z.number().int().positive("Service ID must be a positive integer"),
    ...serviceFields,
  })
  .strict();

export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
