import { z } from "zod";
import { moneyString } from "./common";

export const RESERVED_SLUGS = ["normal", "special", "category"]; // clash with fixed /menu/* routes

export const slugify = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);

const litres = z.string().trim().regex(/^\d{1,3}(\.\d{1,2})?$/, "Enter litres, for example 1 or 2.5").refine((v) => Number(v) > 0, "Must be more than 0");
const optionSchema = z.object({ id: z.string().max(40).optional(), litres, price: moneyString }).strict();

export const mealSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().max(120).optional(),
  description: z.string().trim().min(5).max(2000),
  ingredients: z.string().trim().max(2000).nullish(),
  type: z.enum(["NORMAL", "SPECIAL"]),
  basePrice: moneyString.nullish(),
  categoryId: z.string().max(40).nullish(),
  isAvailable: z.boolean().default(true),
  isFeatured: z.boolean().default(false),
  imageUrl: z.string().url().max(500).nullish(),
  imagePublicId: z.string().max(300).nullish(),
  options: z.array(optionSchema).max(30).default([]),
}).strict().superRefine((m, ctx) => {
  if (m.type === "NORMAL") {
    if (!m.basePrice || Number(m.basePrice) <= 0) ctx.addIssue({ code: "custom", path: ["basePrice"], message: "Enter a price for this meal" });
  } else {
    if (m.options.length === 0) ctx.addIssue({ code: "custom", path: ["options"], message: "Add at least one litre option" });
    const seen = new Set<string>();
    m.options.forEach((o, i) => {
      const key = Number(o.litres).toString();
      if (seen.has(key)) ctx.addIssue({ code: "custom", path: ["options", i, "litres"], message: "This litre size is already listed" });
      seen.add(key);
      if (Number(o.price) <= 0) ctx.addIssue({ code: "custom", path: ["options", i, "price"], message: "Enter a price" });
    });
  }
  if (m.slug && (m.slug !== slugify(m.slug) || RESERVED_SLUGS.includes(m.slug))) ctx.addIssue({ code: "custom", path: ["slug"], message: RESERVED_SLUGS.includes(m.slug) ? "This web address is reserved" : "Use lowercase letters, numbers and hyphens" });
});
export type MealInput = z.infer<typeof mealSchema>;

export const categorySchema = z.object({ name: z.string().trim().min(2).max(60) }).strict();
export const zoneSchema = z.object({ name: z.string().trim().min(2).max(80), fee: moneyString, isActive: z.boolean().default(true) }).strict();
export const faqListSchema = z.object({ items: z.array(z.object({ question: z.string().trim().min(3).max(300), answer: z.string().trim().min(3).max(3000) }).strict()).max(100) }).strict();
export const reorderSchema = z.object({ ids: z.array(z.string().max(40)).min(1).max(500) }).strict();
