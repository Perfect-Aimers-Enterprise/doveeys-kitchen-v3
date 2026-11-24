import { fail, ok } from "@/lib/api";
import { z } from "zod";
import { moneyString } from "@/lib/validation/common";
import { quoteDelivery } from "@/services/delivery.service";
import { toMoneyString } from "@/utils/money";

export const runtime = "nodejs";

const q = z.object({ zoneId: z.string().max(40).optional(), subtotal: moneyString.default("0") });

/** Informational only. The authoritative fee is recomputed server-side when the order is created. */
export async function GET(req: Request) {
  try {
    const p = Object.fromEntries(new URL(req.url).searchParams);
    const { zoneId, subtotal } = q.parse(p);
    const r = await quoteDelivery(zoneId, subtotal);
    return ok({ fee: r.feeString, currency: r.currency, zone: r.zone, total: toMoneyString(r.fee.plus(subtotal)) });
  } catch (e) { return fail(e); }
}
