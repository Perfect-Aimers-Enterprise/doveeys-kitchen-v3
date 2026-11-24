import { ok } from "@/lib/api";
import { adminRoute } from "@/lib/admin-route";
import { zoneSchema } from "@/lib/validation/meal";
import { readJson } from "@/lib/security/request";
import { listZones, saveZone } from "@/services/meal-admin.service";

export const runtime = "nodejs";

export const GET = adminRoute(async () => ok({ zones: await listZones() }));
export const POST = adminRoute(async ({ req, admin }) => ok({ zone: await saveZone(null, zoneSchema.parse(await readJson(req)), admin.id) }, 201));
