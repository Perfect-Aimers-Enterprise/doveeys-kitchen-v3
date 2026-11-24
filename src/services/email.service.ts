import { db } from "@/lib/db";
import { emailConfig } from "@/config";
import { emailConfigured, fromAddress, getTransporter } from "@/lib/email/transport";

type SendInput = {
  to: string | string[];
  template: string;
  subject: string;
  html: string;
  text: string;
  orderId?: string;
  attachments?: { filename: string; content: Buffer; contentType?: string }[];
  /** Set false for emails whose body holds secrets (reset links): they are logged but never stored or retried. */
  storeBody?: boolean;
};

/**
 * Sends one email and records the attempt. Never throws: an email failure must not undo a payment or an order.
 * Failed rows that stored their body are retried by retryFailedEmails (cron).
 */
export async function sendEmail(input: SendInput): Promise<{ ok: boolean; logId: string; error?: string }> {
  const to = Array.isArray(input.to) ? input.to.join(", ") : input.to;
  const store = input.storeBody !== false && !input.attachments?.length;
  const log = await db.emailLog.create({
    data: { to, template: input.template, subject: input.subject, orderId: input.orderId, bodyHtml: store ? input.html : null, bodyText: store ? input.text : null },
  });
  return deliver(log.id, input);
}

async function deliver(logId: string, m: Pick<SendInput, "to" | "subject" | "html" | "text" | "attachments">) {
  try {
    if (!emailConfigured()) throw new Error("SMTP is not configured");
    await getTransporter().sendMail({ from: fromAddress(), to: m.to, subject: m.subject, html: m.html, text: m.text, attachments: m.attachments });
    await db.emailLog.update({ where: { id: logId }, data: { status: "SENT", sentAt: new Date(), attempts: { increment: 1 }, error: null } });
    return { ok: true, logId };
  } catch (err) {
    const message = err instanceof Error ? err.message.slice(0, 500) : "Unknown email error";
    await db.emailLog.update({ where: { id: logId }, data: { status: "FAILED", attempts: { increment: 1 }, error: message } }).catch(() => {});
    return { ok: false, logId, error: message };
  }
}

export async function retryFailedEmails(limit = 25) {
  const rows = await db.emailLog.findMany({
    where: { status: "FAILED", attempts: { lt: emailConfig.maxAttempts }, bodyHtml: { not: null } },
    orderBy: { createdAt: "asc" }, take: limit,
  });
  let sent = 0;
  for (const r of rows) {
    const res = await deliver(r.id, { to: r.to.split(", "), subject: r.subject, html: r.bodyHtml!, text: r.bodyText ?? "" });
    if (res.ok) sent++;
  }
  return { attempted: rows.length, sent };
}
