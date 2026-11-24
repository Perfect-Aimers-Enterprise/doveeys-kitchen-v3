import { z } from "zod";
import { emailSchema, passwordSchema } from "./common";

export const registerSchema = z.object({
  name: z.string().trim().min(2).max(100),
  email: emailSchema,
  password: passwordSchema,
  setupKey: z.string().min(1).max(200),
}).strict();

export const loginSchema = z.object({ email: emailSchema, password: z.string().min(1).max(128) }).strict();
export const forgotSchema = z.object({ email: emailSchema }).strict();
export const resetSchema = z.object({ token: z.string().min(20).max(200), password: passwordSchema }).strict();
