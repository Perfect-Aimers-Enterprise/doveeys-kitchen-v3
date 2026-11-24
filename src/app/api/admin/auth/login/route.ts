import { fail, ok } from "@/lib/api";
import { createSession } from "@/lib/auth/session";
import { loginSchema } from "@/lib/validation/auth";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { assertSameOrigin, clientIp, readJson } from "@/lib/security/request";
import { safeNext } from "@/lib/security/redirect";
import { authenticate } from "@/services/auth.service";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const ip = clientIp(req);
    const raw = (await readJson(req)) as { email?: unknown; password?: unknown; next?: string } | null;
    const body = loginSchema.parse({ email: raw?.email, password: raw?.password });
    const window = 15 * 60 * 1000;
    await enforceRateLimit(`login:ip:${ip}`, 30, window);
    await enforceRateLimit(`login:email:${body.email}`, 10, window);
    const admin = await authenticate(body.email, body.password);
    await createSession(admin.id, { ip, userAgent: req.headers.get("user-agent") });
    return ok({ admin, next: safeNext(raw?.next) });
  } catch (e) { return fail(e); }
}
