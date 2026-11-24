import { db } from "@/lib/db";
import { AppError } from "@/lib/api";

/** Atomic fixed-window limiter backed by PostgreSQL, so it works across serverless instances. */
export async function consumeRateLimit(key: string, limit: number, windowMs: number) {
  const resetAt = new Date(Date.now() + windowMs);
  const rows = await db.$queryRaw<{ count: number; resetAt: Date }[]>`
    INSERT INTO "RateLimit" ("key", "count", "resetAt") VALUES (${key}, 1, ${resetAt})
    ON CONFLICT ("key") DO UPDATE SET
      "count"   = CASE WHEN "RateLimit"."resetAt" <= NOW() THEN 1 ELSE "RateLimit"."count" + 1 END,
      "resetAt" = CASE WHEN "RateLimit"."resetAt" <= NOW() THEN ${resetAt} ELSE "RateLimit"."resetAt" END
    RETURNING "count", "resetAt"`;
  const { count, resetAt: until } = rows[0];
  return { allowed: count <= limit, retryAfterSeconds: Math.max(1, Math.ceil((until.getTime() - Date.now()) / 1000)) };
}

export async function enforceRateLimit(key: string, limit: number, windowMs: number) {
  const r = await consumeRateLimit(key, limit, windowMs);
  if (!r.allowed) throw new AppError("RATE_LIMITED", `Too many attempts. Try again in ${Math.ceil(r.retryAfterSeconds / 60)} minute(s).`, 429);
}
