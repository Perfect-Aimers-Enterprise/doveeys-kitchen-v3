import { z } from "zod";

const ymd = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
export const reportQuery = z.object({
  kind: z.enum(["weekly", "monthly", "custom"]),
  offset: z.coerce.number().int().min(0).max(120).default(0),
  from: ymd.optional(), to: ymd.optional(),
}).refine((v) => v.kind !== "custom" || (v.from && v.to && v.to >= v.from), "Custom reports need valid from and to dates");
