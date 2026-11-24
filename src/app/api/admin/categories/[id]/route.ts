import { ok } from "@/lib/api";
import { adminRoute } from "@/lib/admin-route";
import { categorySchema } from "@/lib/validation/meal";
import { readJson } from "@/lib/security/request";
import { archiveCategory, renameCategory } from "@/services/meal-admin.service";

export const runtime = "nodejs";
type P = { id: string };

export const PATCH = adminRoute<P>(async ({ req, admin, params }) => ok({ category: await renameCategory(params.id, categorySchema.parse(await readJson(req)).name, admin.id) }));
export const DELETE = adminRoute<P>(async ({ admin, params }) => { await archiveCategory(params.id, admin.id); return ok({ archived: true }); });
