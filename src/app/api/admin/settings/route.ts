import { z } from "zod";
import { ok } from "@/lib/api";
import { adminRoute } from "@/lib/admin-route";
import { readJson } from "@/lib/security/request";
import { getAllSettings, saveSettings } from "@/services/settings.service";

export const runtime = "nodejs";

export const GET = adminRoute(async () => ok({ settings: await getAllSettings() }));

/** `values` maps setting keys to new values. A null value removes the saved override, restoring the config-file default. */
export const PUT = adminRoute(async ({ req, admin }) => {
  const { values } = z.object({ values: z.record(z.string(), z.unknown()) }).strict().parse(await readJson(req));
  await saveSettings(values, admin.id);
  return ok({ settings: await getAllSettings() });
});
