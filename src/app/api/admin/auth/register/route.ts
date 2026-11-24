import { fail, ok } from "@/lib/api";
import { createSession } from "@/lib/auth/session";
import { registerSchema } from "@/lib/validation/auth";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { assertSameOrigin, clientIp, readJson } from "@/lib/security/request";
import { registerAdmin, registrationOpen } from "@/services/auth.service";

export const runtime = "nodejs";

export async function GET() {
  try { return ok({ open: await registrationOpen() }); } catch (e) { return fail(e); }
}

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    const ip = clientIp(req);
    await enforceRateLimit(`register:${ip}`, 5, 60 * 60 * 1000);
    const body = registerSchema.parse(await readJson(req));
    const admin = await registerAdmin(body);
    await createSession(admin.id, { ip, userAgent: req.headers.get("user-agent") });
    return ok({ admin }, 201);
  } catch (e) { return fail(e); }
}
