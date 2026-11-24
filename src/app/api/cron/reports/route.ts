import { fail, ok } from "@/lib/api";
import { assertCron } from "@/lib/cron-auth";
import { runScheduledReports } from "@/services/report.service";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(req: Request) {
  try { assertCron(req); return ok({ results: await runScheduledReports() }); } catch (e) { return fail(e); }
}
