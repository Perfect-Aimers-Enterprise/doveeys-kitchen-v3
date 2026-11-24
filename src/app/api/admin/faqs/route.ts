import { ok } from "@/lib/api";
import { db } from "@/lib/db";
import { adminRoute } from "@/lib/admin-route";
import { faqListSchema } from "@/lib/validation/meal";
import { readJson } from "@/lib/security/request";
import { replaceFaqs } from "@/services/meal-admin.service";

export const runtime = "nodejs";

export const GET = adminRoute(async () => ok({ items: await db.faq.findMany({ orderBy: { sortOrder: "asc" }, select: { id: true, question: true, answer: true } }) }));

/** Replaces the whole ordered list, so adding, editing, reordering and removing FAQs is one operation. */
export const PUT = adminRoute(async ({ req, admin }) => { await replaceFaqs(faqListSchema.parse(await readJson(req)).items, admin.id); return ok({ saved: true }); });
