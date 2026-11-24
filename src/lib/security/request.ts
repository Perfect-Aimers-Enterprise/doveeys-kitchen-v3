import { AppError } from "@/lib/api";
import { siteConfig } from "@/config";

export function clientIp(req: Request) {
  return req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || req.headers.get("x-real-ip") || "unknown";
}

/** CSRF defence in depth (cookies are also SameSite=Lax): reject cross-origin browser requests. */
export function assertSameOrigin(req: Request) {
  const origin = req.headers.get("origin");
  if (!origin) return;
  const expected = new URL(siteConfig.appUrl).host;
  let host = "";
  try { host = new URL(origin).host; } catch {}
  if (host !== expected && host !== req.headers.get("host")) throw new AppError("FORBIDDEN_ORIGIN", "Request blocked.", 403);
}

export async function readJson(req: Request): Promise<unknown> {
  try { return await req.json(); } catch { throw new AppError("INVALID_JSON", "Send a valid JSON body.", 400); }
}
