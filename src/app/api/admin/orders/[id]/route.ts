import { AppError, ok } from "@/lib/api";
import { adminRoute } from "@/lib/admin-route";
import { getOrderDetail } from "@/services/order-query.service";

export const runtime = "nodejs";

export const GET = adminRoute<{ id: string }>(async ({ params }) => {
  const order = await getOrderDetail(params.id);
  if (!order) throw new AppError("ORDER_NOT_FOUND", "Order not found.", 404);
  return ok({ order });
});
