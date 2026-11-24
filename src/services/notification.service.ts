import { db } from "@/lib/db";
import { getSetting } from "./settings.service";
import { sendEmail } from "./email.service";
import {
  adminNewOrder,
  customerOrderConfirmation,
  customerStatusUpdate,
} from "@/lib/email/order-templates";
import type { OrderStatus } from "@/lib/order-status";

const load = (id: string) =>
  db.order.findUniqueOrThrow({ where: { id }, include: { items: true, payment: true } });

export async function notifyOrderPaid(orderId: string, trackingToken: string, appUrl: string) {
  const order = await load(orderId);
  const email = { ...order, paystackReference: order.payment?.paystackReference };

  const customer = customerOrderConfirmation(email, `${appUrl}/track/${trackingToken}`);
  await sendEmail({
    to: order.customerEmail,
    template: "order-confirmation",
    orderId,
    subject: customer.subject,
    html: customer.html,
    text: customer.text,
    storeBody: false,
  });

  const recipients = await getSetting("notify.recipients");
  if (recipients.length > 0) {
    const admin = adminNewOrder(email, `${appUrl}/admin/orders/${order.id}`);
    await sendEmail({
      to: recipients,
      template: "admin-new-order",
      orderId,
      subject: admin.subject,
      html: admin.html,
      text: admin.text,
    });
  } else {
    console.warn("[notify] no administrator notification recipients are configured");
  }
}

export async function notifyStatusChange(orderId: string, status: OrderStatus) {
  const order = await load(orderId);
  const mail = customerStatusUpdate(order, status);
  if (!mail) return;
  await sendEmail({
    to: order.customerEmail,
    template: `order-${status.toLowerCase()}`,
    orderId,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
  });
}
