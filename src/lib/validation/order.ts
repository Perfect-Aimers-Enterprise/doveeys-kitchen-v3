import { z } from "zod";
import { emailSchema } from "./common";

const id = z.string().min(1).max(40);

export const createOrderSchema = z.object({
  items: z.array(z.object({ mealId: id, optionId: id.nullish(), quantity: z.number().int().min(1).max(50) }).strict()).min(1).max(40),
  customer: z.object({
    name: z.string().trim().min(2).max(120),
    email: emailSchema,
    phone: z.string().trim().regex(/^\+?[0-9 ()-]{7,20}$/, "Enter a valid phone number"),
  }).strict(),
  delivery: z.object({
    address: z.string().trim().min(5).max(500),
    notes: z.string().trim().max(500).optional(),
    zoneId: id.nullish(),
  }).strict(),
}).strict();

export type CreateOrderInput = z.infer<typeof createOrderSchema>;
