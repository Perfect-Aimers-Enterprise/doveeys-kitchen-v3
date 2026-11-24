import { z } from "zod";
import { ok } from "@/lib/api";
import { adminRoute } from "@/lib/admin-route";
import { moneyString } from "@/lib/validation/common";
import { readJson } from "@/lib/security/request";
import { recordRefund } from "@/services/order-query.service";

export const runtime = "nodejs";

const body = z.object({ amount: moneyString, note: z.string().trim().max(300).optional() }).strict();

/** Records a refund already made in Paystack so revenue figures stay correct. It does not send money. */
export const POST = adminRoute<{ id: string }>(async ({ req, admin, params }) => {
  const { amount, note } = body.parse(await readJson(req));
  return ok(await recordRefund(params.id, amount, note, admin.id));
});
