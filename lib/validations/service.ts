import { z } from "zod";

export const SERVICE_LIMITS = {
  name: 100,
  minDuration: 5,
  maxDuration: 480,
  maxPrice: 99999999.99,
};
const priceMessage =
  "Price must be between 0 and 99999999.99 with at most 2 decimal places";
const priceSchema = z
  .union([z.number().finite(), z.string().trim()])
  .refine(
    (value) =>
      /^\d+(?:\.\d{1,2})?$/.test(String(value)) &&
      Number(value) <= SERVICE_LIMITS.maxPrice,
    priceMessage
  )
  .transform((value) => String(value));

const serviceFields = {
  name: z
    .string()
    .trim()
    .min(1, "Name is required")
    .max(SERVICE_LIMITS.name, "Name must be 100 characters or fewer"),
  price: priceSchema,
  durationMinutes: z
    .number()
    .int("Duration must be a whole number of minutes")
    .min(SERVICE_LIMITS.minDuration, "Duration must be at least 5 minutes")
    .max(SERVICE_LIMITS.maxDuration, "Duration must be at most 480 minutes"),
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
