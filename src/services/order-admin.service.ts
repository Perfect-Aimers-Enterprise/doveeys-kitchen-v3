import { db } from "@/lib/db";
import { AppError } from "@/lib/api";
import { assertAdminTransition, type OrderStatus } from "@/lib/order-status";
import { notifyStatusChange } from "./notification.service";

export async function changeOrderStatus(orderId: string, to: OrderStatus, adminId: string, note?: string) {
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) throw new AppError("ORDER_NOT_FOUND", "Order not found.", 404);
  const check = assertAdminTransition(order.status, to, order.paymentStatus);
  if (!check.ok) throw new AppError("INVALID_TRANSITION", check.reason, 409);

  await db.$transaction(async (t) => {
    // Guarded by the status we validated against: a concurrent change makes this update match zero rows.
    const res = await t.order.updateMany({ where: { id: orderId, status: order.status, paymentStatus: "SUCCESSFUL" }, data: { status: to } });
    if (res.count !== 1) throw new AppError("STATUS_CONFLICT", "This order was just updated by someone else. Refresh and try again.", 409);
    await t.orderStatusHistory.create({ data: { orderId, fromStatus: order.status, toStatus: to, adminId, note } });
    await t.adminAuditLog.create({ data: { adminId, action: "order.status", entity: "Order", entityId: orderId, metadata: { from: order.status, to } } });
  });
  await notifyStatusChange(orderId, to);
  return { id: orderId, from: order.status, to };
}
