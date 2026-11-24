import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { clientIp } from "@/lib/security/request";
import { verifyAndApplyPayment } from "@/services/payment.service";

export const runtime = "nodejs";

const ref = z.string().regex(/^DKP-[a-f0-9]{24}$/);

/** The browser redirect is only a hint to call this. The result always comes from Paystack, never from the URL. */
export async function GET(req: Request) {
  try {
    await enforceRateLimit(`verify:${clientIp(req)}`, 60, 10 * 60 * 1000);
    const reference = ref.parse(new URL(req.url).searchParams.get("reference") ?? new URL(req.url).searchParams.get("trxref"));
    const r = await verifyAndApplyPayment(reference);
    return ok({ state: r.state, orderReference: r.orderReference });
  } catch (e) { return fail(e); }
}
