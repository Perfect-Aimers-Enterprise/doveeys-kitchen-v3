import { layout, button, esc } from "./templates";
import { formatMoney } from "@/utils/money";
import { STATUS_LABEL, type OrderStatus } from "@/lib/order-status";

export type EmailOrder = {
  id: string; reference: string; customerName: string; customerEmail: string; customerPhone: string;
  deliveryAddress: string; deliveryNotes: string | null; deliveryZoneName: string | null;
  subtotal: { toString(): string }; deliveryFee: { toString(): string }; total: { toString(): string }; currency: string;
  items: { mealName: string; litres: { toString(): string } | null; quantity: number; unitPrice: { toString(): string }; lineTotal: { toString(): string } }[];
  paystackReference?: string;
};

const itemLabel = (i: EmailOrder["items"][number]) => `${i.mealName}${i.litres ? ` (${i.litres.toString()} L)` : ""}`;
const row = (a: string, b: string) => `<tr><td style="padding:6px 0;color:#77776F">${esc(a)}</td><td style="padding:6px 0" align="right">${esc(b)}</td></tr>`;

function itemsTable(o: EmailOrder) {
  const rows = o.items.map((i) => `<tr><td style="padding:8px 0;border-bottom:1px solid #E6E3D9">${esc(itemLabel(i))} × ${i.quantity}</td><td style="padding:8px 0;border-bottom:1px solid #E6E3D9" align="right">${esc(formatMoney(i.lineTotal.toString(), o.currency))}</td></tr>`).join("");
  return `<table width="100%" cellspacing="0" style="font-size:14px;margin:16px 0">${rows}${row("Delivery", formatMoney(o.deliveryFee.toString(), o.currency))}<tr><td style="padding:10px 0;font-weight:600">Total</td><td style="padding:10px 0;font-weight:600" align="right">${esc(formatMoney(o.total.toString(), o.currency))}</td></tr></table>`;
}
const itemsText = (o: EmailOrder) => o.items.map((i) => `- ${itemLabel(i)} x ${i.quantity}: ${formatMoney(i.lineTotal.toString(), o.currency)}`).join("\n");

export function customerOrderConfirmation(o: EmailOrder, trackUrl: string) {
  return {
    subject: `Payment received: order ${o.reference}`,
    html: layout("Thank you, your payment is confirmed", `<p style="line-height:1.6">Hello ${esc(o.customerName)}, we have received your payment for order <strong>${esc(o.reference)}</strong>.</p>${itemsTable(o)}<p style="line-height:1.6">Follow your order any time with the link below. Keep this email: it is the only place this link is sent.</p>${button(trackUrl, "Track your order")}`),
    text: `Hello ${o.customerName},\n\nWe have received your payment for order ${o.reference}.\n\n${itemsText(o)}\nDelivery: ${formatMoney(o.deliveryFee.toString(), o.currency)}\nTotal: ${formatMoney(o.total.toString(), o.currency)}\n\nTrack your order (keep this email, the link is sent only once):\n${trackUrl}`,
  };
}

export function adminNewOrder(o: EmailOrder, adminUrl: string) {
  const details = `<table width="100%" cellspacing="0" style="font-size:14px">${row("Order", o.reference)}${row("Customer", o.customerName)}${row("Email", o.customerEmail)}${row("Phone", o.customerPhone)}${row("Address", o.deliveryAddress + (o.deliveryZoneName ? ` (${o.deliveryZoneName})` : ""))}${o.deliveryNotes ? row("Notes", o.deliveryNotes) : ""}${row("Paystack reference", o.paystackReference ?? "")}</table>`;
  return {
    subject: `New paid order ${o.reference}: ${formatMoney(o.total.toString(), o.currency)}`,
    html: layout("New paid order", `${details}${itemsTable(o)}${button(adminUrl, "Open order")}<p style="font-size:13px;color:#77776F">You will be asked to sign in first.</p>`),
    text: `New paid order ${o.reference}\n\nCustomer: ${o.customerName}\nEmail: ${o.customerEmail}\nPhone: ${o.customerPhone}\nAddress: ${o.deliveryAddress}${o.deliveryZoneName ? ` (${o.deliveryZoneName})` : ""}\nPaystack reference: ${o.paystackReference ?? ""}\n\n${itemsText(o)}\nTotal: ${formatMoney(o.total.toString(), o.currency)}\n\nOpen the order (sign-in required):\n${adminUrl}`,
  };
}

const STATUS_COPY: Partial<Record<OrderStatus, string>> = {
  CONFIRMED: "Your order has been confirmed.",
  PROCESSING: "Your order is now being prepared.",
  READY: "Your order is ready.",
  OUT_FOR_DELIVERY: "Your order is out for delivery.",
  DELIVERED: "Your order has been delivered. Enjoy your meal.",
  CANCELLED: "Your order has been cancelled. Contact us if you have questions about your payment.",
};

export function customerStatusUpdate(o: EmailOrder, status: OrderStatus) {
  const copy = STATUS_COPY[status];
  if (!copy) return null;
  const line = `${copy} Use the tracking link in your payment confirmation email to follow your order.`;
  return {
    subject: `Order ${o.reference}: ${STATUS_LABEL[status].toLowerCase()}`,
    html: layout(STATUS_LABEL[status], `<p style="line-height:1.6">Hello ${esc(o.customerName)}, ${esc(line)}</p><p style="color:#77776F;font-size:13px">Order ${esc(o.reference)}</p>`),
    text: `Hello ${o.customerName},\n\n${line}\n\nOrder ${o.reference}`,
  };
}
