import { Prisma, type OrderStatus, type PaymentStatus } from "@prisma/client";
import { db } from "@/lib/db";
import { AppError } from "@/lib/api";
import { money, toMoneyString } from "@/utils/money";
import { notifyStatusChange } from "./notification.service";

const STATUSES = ["PENDING_PAYMENT", "PAID", "CONFIRMED", "PROCESSING", "READY", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"];
const PAYMENTS = ["PENDING", "SUCCESSFUL", "FAILED", "REFUNDED"];

export type OrderFilters = { q?: string; status?: string; payment?: string; from?: Date; to?: Date; page?: number; pageSize?: number };

export async function listOrders(f: OrderFilters) {
  const pageSize = f.pageSize ?? 20, page = Math.max(1, f.page ?? 1);
  const where: Prisma.OrderWhereInput = {
    ...(f.status && STATUSES.includes(f.status) ? { status: f.status as OrderStatus } : {}),
    ...(f.payment && PAYMENTS.includes(f.payment) ? { paymentStatus: f.payment as PaymentStatus } : {}),
    ...(f.from || f.to ? { createdAt: { ...(f.from ? { gte: f.from } : {}), ...(f.to ? { lt: f.to } : {}) } } : {}),
    ...(f.q ? { OR: [
      { reference: { contains: f.q, mode: "insensitive" } }, { customerName: { contains: f.q, mode: "insensitive" } },
      { customerEmail: { contains: f.q, mode: "insensitive" } }, { customerPhone: { contains: f.q } },
    ] } : {}),
  };
  const [orders, total] = await Promise.all([
    db.order.findMany({ where, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize, include: { _count: { select: { items: true } } } }),
    db.order.count({ where }),
  ]);
  return { orders, total, page, pageSize, pages: Math.max(1, Math.ceil(total / pageSize)) };
}

export async function getOrderDetail(id: string) {
  return db.order.findUnique({
    where: { id },
    include: { items: true, payment: true, history: { orderBy: { createdAt: "asc" }, include: { admin: { select: { name: true } } } }, emails: { orderBy: { createdAt: "desc" }, take: 20 } },
  });
}

/**
 * Records a refund that was made in the Paystack dashboard. This does NOT move money: Paystack's refund API is not
 * integrated. It keeps the books (and the reports) accurate.
 */
export async function recordRefund(orderId: string, amount: string, note: string | undefined, adminId: string) {
  const order = await db.order.findUnique({ where: { id: orderId }, include: { payment: true } });
  if (!order?.payment) throw new AppError("ORDER_NOT_FOUND", "Order or payment not found.", 404);
  if (!["SUCCESSFUL", "REFUNDED"].includes(order.paymentStatus)) throw new AppError("NOT_PAID", "Only paid orders can be refunded.", 409);
  const remaining = money(order.payment.amount).minus(order.payment.refundedAmount);
  const value = money(amount);
  if (value.lte(0) || value.gt(remaining)) throw new AppError("INVALID_REFUND", `Enter an amount between 0.01 and ${toMoneyString(remaining)}.`, 422, { amount: `At most ${toMoneyString(remaining)}` });
  const total = money(order.payment.refundedAmount).plus(value);
  const full = total.gte(order.payment.amount);
  await db.$transaction(async (t) => {
    const res = await t.payment.updateMany({ where: { id: order.payment!.id, refundedAmount: order.payment!.refundedAmount }, data: { refundedAmount: total.toFixed(2), status: full ? "REFUNDED" : "SUCCESSFUL" } });
    if (res.count !== 1) throw new AppError("REFUND_CONFLICT", "This payment was just updated. Refresh and try again.", 409);
    if (full) await t.order.update({ where: { id: orderId }, data: { paymentStatus: "REFUNDED" } });
    await t.orderStatusHistory.create({ data: { orderId, fromStatus: order.status, toStatus: order.status, adminId, note: `Refund recorded: ${toMoneyString(value)}${note ? `. ${note}` : ""}` } });
    await t.adminAuditLog.create({ data: { adminId, action: "order.refund", entity: "Order", entityId: orderId, metadata: { amount: toMoneyString(value), full } } });
  });
  return { refunded: toMoneyString(total), remaining: toMoneyString(money(order.payment.amount).minus(total)), full };
}
