import { db } from "@/lib/db";
import { sha256 } from "@/lib/security/tokens";
import { STATUS_LABEL, type OrderStatus } from "@/lib/order-status";
import { toMoneyString } from "@/utils/money";

const STEPS: OrderStatus[] = ["PAID", "CONFIRMED", "PROCESSING", "READY", "OUT_FOR_DELIVERY", "DELIVERED"];

/** Safe public view: no email, phone, street address, admin identities or internal notes. */
export async function getTrackingView(token: string) {
  const order = await db.order.findUnique({
    where: { trackingTokenHash: sha256(token) },
    include: { items: true, history: { orderBy: { createdAt: "asc" } } },
  });
  if (!order) return null;
  const reached = new Map(order.history.map((h) => [h.toStatus, h.createdAt]));
  const cancelled = order.status === "CANCELLED";
  return {
    orderReference: order.reference,
    customerFirstName: order.customerName.split(" ")[0],
    payment: { status: order.paymentStatus, paidAt: order.paidAt },
    status: order.status, statusLabel: STATUS_LABEL[order.status],
    deliveryArea: order.deliveryZoneName,
    items: order.items.map((i) => ({ name: i.mealName, litres: i.litres?.toString() ?? null, quantity: i.quantity, unitPrice: toMoneyString(i.unitPrice), lineTotal: toMoneyString(i.lineTotal) })),
    subtotal: toMoneyString(order.subtotal), deliveryFee: toMoneyString(order.deliveryFee), total: toMoneyString(order.total), currency: order.currency,
    timeline: STEPS.map((s) => ({ status: s, label: STATUS_LABEL[s], reachedAt: reached.get(s) ?? null, current: order.status === s })),
    cancelled, cancelledAt: cancelled ? reached.get("CANCELLED") ?? null : null,
    placedAt: order.createdAt,
  };
}
