import { fail, ok } from "@/lib/api";
import { forgotSchema } from "@/lib/validation/auth";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { assertSameOrigin, clientIp, readJson } from "@/lib/security/request";
import { requestPasswordReset } from "@/services/auth.service";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    await enforceRateLimit(`forgot:${clientIp(req)}`, 5, 60 * 60 * 1000);
    const { email } = forgotSchema.parse(await readJson(req));
    await enforceRateLimit(`forgot:email:${email}`, 3, 60 * 60 * 1000);
    await requestPasswordReset(email);
    return ok({ message: "If that email belongs to an administrator, a reset link is on its way." });
  } catch (e) { return fail(e); }
}
