export type OrderStatus = "PENDING_PAYMENT" | "PAID" | "CONFIRMED" | "PROCESSING" | "READY" | "OUT_FOR_DELIVERY" | "DELIVERED" | "CANCELLED";

// PENDING_PAYMENT is deliberately absent as a source: only a verified Paystack payment may move an order out of it.
export const TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  PENDING_PAYMENT: [],
  PAID: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PROCESSING", "CANCELLED"],
  PROCESSING: ["READY", "CANCELLED"],
  READY: ["OUT_FOR_DELIVERY", "CANCELLED"],
  OUT_FOR_DELIVERY: ["DELIVERED"],
  DELIVERED: [],
  CANCELLED: [],
};

export const canTransition = (from: OrderStatus, to: OrderStatus) => TRANSITIONS[from].includes(to);

/** Admin-initiated change. Payment must be confirmed, whatever the status says. */
export function assertAdminTransition(from: OrderStatus, to: OrderStatus, paymentStatus: string) {
  if (paymentStatus !== "SUCCESSFUL") return { ok: false as const, reason: "This order has not been paid, so it cannot be processed." };
  if (!canTransition(from, to)) return { ok: false as const, reason: `An order that is ${from.toLowerCase().replace(/_/g, " ")} cannot be changed to ${to.toLowerCase().replace(/_/g, " ")}.` };
  return { ok: true as const };
}

export const STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Awaiting payment", PAID: "Paid", CONFIRMED: "Confirmed", PROCESSING: "Being prepared",
  READY: "Ready", OUT_FOR_DELIVERY: "Out for delivery", DELIVERED: "Delivered", CANCELLED: "Cancelled",
};
