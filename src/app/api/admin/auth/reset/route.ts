import { fail, ok } from "@/lib/api";
import { resetSchema } from "@/lib/validation/auth";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { assertSameOrigin, clientIp, readJson } from "@/lib/security/request";
import { resetPassword } from "@/services/auth.service";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    assertSameOrigin(req);
    await enforceRateLimit(`reset:${clientIp(req)}`, 10, 60 * 60 * 1000);
    const { token, password } = resetSchema.parse(await readJson(req));
    await resetPassword(token, password);
    return ok({ reset: true });
  } catch (e) { return fail(e); }
}
