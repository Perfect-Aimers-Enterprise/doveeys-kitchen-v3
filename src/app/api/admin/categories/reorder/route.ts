import { ok } from "@/lib/api";
import { adminRoute } from "@/lib/admin-route";
import { reorderSchema } from "@/lib/validation/meal";
import { readJson } from "@/lib/security/request";
import { reorder } from "@/services/meal-admin.service";

export const runtime = "nodejs";

export const POST = adminRoute(async ({ req, admin }) => { await reorder("mealCategory", reorderSchema.parse(await readJson(req)).ids, admin.id); return ok({ reordered: true }); });
