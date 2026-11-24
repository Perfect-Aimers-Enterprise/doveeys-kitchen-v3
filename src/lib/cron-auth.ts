import { safeEqual, sha256 } from "@/lib/security/tokens";
import { AppError } from "@/lib/api";

/** Vercel Cron sends `Authorization: Bearer $CRON_SECRET`. Anything else is rejected. */
export function assertCron(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) throw new AppError("CRON_NOT_CONFIGURED", "CRON_SECRET is not set.", 503);
  const given = req.headers.get("authorization") ?? "";
  if (!safeEqual(sha256(given), sha256(`Bearer ${secret}`))) throw new AppError("UNAUTHORIZED", "Unauthorized.", 401);
}
