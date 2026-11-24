import { ok } from "@/lib/api";
import { adminRoute } from "@/lib/admin-route";
import { zoneSchema } from "@/lib/validation/meal";
import { readJson } from "@/lib/security/request";
import { deleteZone, saveZone } from "@/services/meal-admin.service";

export const runtime = "nodejs";
type P = { id: string };

export const PUT = adminRoute<P>(async ({ req, admin, params }) => ok({ zone: await saveZone(params.id, zoneSchema.parse(await readJson(req)), admin.id) }));
export const DELETE = adminRoute<P>(async ({ admin, params }) => { await deleteZone(params.id, admin.id); return ok({ deleted: true }); });
