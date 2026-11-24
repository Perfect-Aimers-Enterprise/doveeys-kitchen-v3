import { fail, ok } from "@/lib/api";
import { createOrderSchema } from "@/lib/validation/order";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { clientIp, readJson } from "@/lib/security/request";
import { createOrderAndInitializePayment } from "@/services/order.service";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    await enforceRateLimit(`order:${clientIp(req)}`, 10, 60 * 60 * 1000);
    const input = createOrderSchema.parse(await readJson(req));
    return ok(await createOrderAndInitializePayment(input), 201);
  } catch (e) { return fail(e); }
}
