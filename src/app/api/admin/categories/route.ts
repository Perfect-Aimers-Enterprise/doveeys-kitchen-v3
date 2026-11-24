import { ok } from "@/lib/api";
import { adminRoute } from "@/lib/admin-route";
import { categorySchema } from "@/lib/validation/meal";
import { readJson } from "@/lib/security/request";
import { createCategory, listAdminCategories } from "@/services/meal-admin.service";

export const runtime = "nodejs";

export const GET = adminRoute(async () => ok({ categories: await listAdminCategories() }));
export const POST = adminRoute(async ({ req, admin }) => ok({ category: await createCategory(categorySchema.parse(await readJson(req)).name, admin.id) }, 201));
