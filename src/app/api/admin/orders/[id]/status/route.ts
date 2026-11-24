import { z } from "zod";
import { fail, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/session";
import { assertSameOrigin, readJson } from "@/lib/security/request";
import { changeOrderStatus } from "@/services/order-admin.service";

export const runtime = "nodejs";

const body = z.object({
  status: z.enum(["CONFIRMED", "PROCESSING", "READY", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"]),
  note: z.string().trim().max(500).optional(),
}).strict();

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    assertSameOrigin(req);
    const admin = await requireAdmin();
    const { status, note } = body.parse(await readJson(req));
    return ok(await changeOrderStatus((await params).id, status, admin.id, note));
  } catch (e) { return fail(e); }
}
