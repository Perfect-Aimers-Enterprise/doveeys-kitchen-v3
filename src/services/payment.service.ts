import { db } from "@/lib/db";
import { AppError } from "@/lib/api";
import { siteConfig } from "@/config";
import { randomToken, sha256 } from "@/lib/security/tokens";
import { verifyTransaction } from "@/lib/paystack/client";
import { toMinorUnits } from "@/utils/money";
import { notifyOrderPaid } from "./notification.service";

export type VerifyOutcome =
  | { state: "paid"; orderReference: string; newlyPaid: boolean }
  | { state: "pending" | "failed" | "mismatch"; orderReference: string };

/**
 * Independently confirms a transaction with Paystack and, only if everything matches, marks the order paid.
 * Safe to call repeatedly and concurrently (browser verify + webhook): the payment row is claimed with a
 * conditional update, so exactly one caller performs the transition and sends the emails.
 */
export async function verifyAndApplyPayment(reference: string): Promise<VerifyOutcome> {
  const payment = await db.payment.findUnique({ where: { paystackReference: reference }, include: { order: true } });
  if (!payment) throw new AppError("PAYMENT_NOT_FOUND", "We could not find that payment.", 404);
  const orderReference = payment.order.reference;
  if (payment.status === "SUCCESSFUL") return { state: "paid", orderReference, newlyPaid: false };

  let tx;
  try { tx = await verifyTransaction(reference); }
  catch (e) { console.error("[payment] verify failed", e); throw new AppError("VERIFY_UNAVAILABLE", "We could not confirm the payment yet. Try again shortly.", 502); }

  if (tx.status === "failed") {
    await db.$transaction([
      db.payment.updateMany({ where: { id: payment.id, status: "PENDING" }, data: { status: "FAILED", rawVerification: tx as never, verifiedAt: new Date() } }),
      db.order.updateMany({ where: { id: payment.orderId, paymentStatus: "PENDING" }, data: { paymentStatus: "FAILED" } }),
    ]);
    return { state: "failed", orderReference };
  }
  if (tx.status !== "success") return { state: "pending", orderReference };

  const matches = tx.reference === payment.paystackReference && tx.currency === payment.currency && tx.amount === toMinorUnits(payment.amount.toString());
  if (!matches) {
    console.error("[payment] verification mismatch", { reference, expected: [payment.currency, payment.amount.toString()], got: [tx.currency, tx.amount] });
    await db.payment.update({ where: { id: payment.id }, data: { rawVerification: tx as never, verifiedAt: new Date() } });
    return { state: "mismatch", orderReference };
  }

  const token = randomToken(32);
  const claimed = await db.$transaction(async (t) => {
    const won = await t.payment.updateMany({
      where: { id: payment.id, status: { not: "SUCCESSFUL" } },
      data: { status: "SUCCESSFUL", channel: tx.channel, rawVerification: tx as never, verifiedAt: new Date() },
    });
    if (won.count === 0) return false; // another request already completed this payment
    const moved = await t.order.updateMany({
      where: { id: payment.orderId, status: "PENDING_PAYMENT" },
      data: { status: "PAID", paymentStatus: "SUCCESSFUL", paidAt: new Date(), trackingTokenHash: sha256(token) },
    });
    if (moved.count === 1) {
      await t.orderStatusHistory.create({ data: { orderId: payment.orderId, fromStatus: "PENDING_PAYMENT", toStatus: "PAID", note: "Payment verified with Paystack" } });
    } else {
      // Order was cancelled before the money arrived: record the payment, keep the status, flag for the admin.
      await t.order.update({ where: { id: payment.orderId }, data: { paymentStatus: "SUCCESSFUL", paidAt: new Date() } });
      await t.orderStatusHistory.create({ data: { orderId: payment.orderId, fromStatus: payment.order.status, toStatus: payment.order.status, note: "Payment received after the order was closed: refund may be needed" } });
      return false;
    }
    return true;
  });

  if (claimed) {
    // After commit and fire-and-forget safe: sendEmail never throws, so a mail failure cannot undo the payment.
    await notifyOrderPaid(payment.orderId, token, siteConfig.appUrl);
  }
  return { state: "paid", orderReference, newlyPaid: claimed };
}
