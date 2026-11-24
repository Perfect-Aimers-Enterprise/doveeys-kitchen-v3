import { fail, ok } from "@/lib/api";
import { assertCron } from "@/lib/cron-auth";
import { retryFailedEmails } from "@/services/email.service";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try { assertCron(req); return ok(await retryFailedEmails()); } catch (e) { return fail(e); }
}
