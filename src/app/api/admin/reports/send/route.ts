import { z } from "zod";
import { ok } from "@/lib/api";
import { adminRoute } from "@/lib/admin-route";
import { readJson } from "@/lib/security/request";
import { getSetting } from "@/services/settings.service";
import { completedPeriod, sendReport } from "@/services/report.service";

export const runtime = "nodejs";
export const maxDuration = 60;

const body = z.object({ kind: z.enum(["WEEKLY", "MONTHLY"]), offset: z.number().int().min(0).max(120).default(0), force: z.boolean().default(false) }).strict();

/** Manually emails a completed period. Without `force`, a period that was already sent is not sent twice. */
export const POST = adminRoute(async ({ req }) => {
  const b = body.parse(await readJson(req));
  const r = await sendReport(completedPeriod(b.kind, await getSetting("reports.timezone"), new Date(), b.offset), { force: b.force });
  return ok(r);
});
