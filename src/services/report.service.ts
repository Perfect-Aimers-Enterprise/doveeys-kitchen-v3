import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { AppError } from "@/lib/api";
import { brandConfig } from "@/config";
import { renderReportPdf } from "@/lib/reports/pdf";
import { layout, esc } from "@/lib/email/templates";
import { formatMoney } from "@/utils/money";
import { fmtDate, fmtDateTime } from "@/utils/format";
import { addLocalDays, addLocalMonths, localParts, startOfMonth, startOfWeek, zonedMidnight } from "@/utils/tz";
import { getAnalytics } from "./analytics.service";
import { getSetting } from "./settings.service";
import { sendEmail } from "./email.service";

export type Kind = "WEEKLY" | "MONTHLY";
export type Period = { kind: Kind; from: Date; to: Date };

/** offset 0 = the last complete week/month, 1 = the one before, and so on. `to` is exclusive. */
export function completedPeriod(kind: Kind, tz: string, now = new Date(), offset = 0): Period {
  if (kind === "WEEKLY") { const end = addLocalDays(startOfWeek(now, tz), -7 * offset, tz); return { kind, from: addLocalDays(end, -7, tz), to: end }; }
  const end = addLocalMonths(startOfMonth(now, tz), -offset, tz);
  return { kind, from: addLocalMonths(end, -1, tz), to: end };
}

export const periodLabel = (p: { from: Date; to: Date }, tz: string) => `${fmtDate(p.from, tz)} to ${fmtDate(new Date(p.to.getTime() - 1), tz)}`;

export async function buildReportPdf(from: Date, to: Date, title: string) {
  const [tz, currency] = await Promise.all([getSetting("reports.timezone"), getSetting("business.currency")]);
  const analytics = await getAnalytics(from, to, tz);
  const pdf = await renderReportPdf(analytics, { title, periodLabel: periodLabel({ from, to }, tz), generatedLabel: fmtDateTime(new Date(), tz), currency, timezone: tz, brandName: await getSetting("brand.name") });
  return { pdf, analytics, tz, currency };
}

async function recipientsFor() {
  const own = await getSetting("reports.recipients");
  return own.length ? own : getSetting("notify.recipients");
}

/** Take the right to send a period. Duplicate triggers (cron retries, double clicks) return null instead of sending twice. */
async function claim(p: Period, force: boolean) {
  try { return await db.reportLog.create({ data: { kind: p.kind, periodStart: p.from, periodEnd: p.to, status: "GENERATING" } }); }
  catch (e) {
    if (!(e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")) throw e;
    const prev = await db.reportLog.findUniqueOrThrow({ where: { kind_periodStart: { kind: p.kind, periodStart: p.from } } });
    const stale = prev.status === "GENERATING" && Date.now() - prev.createdAt.getTime() > 15 * 60_000;
    if (prev.status === "SENT" && !force) return null;
    if (prev.status === "GENERATING" && !stale && !force) return null;
    const res = await db.reportLog.updateMany({ where: { id: prev.id, status: prev.status }, data: { status: "GENERATING", error: null, createdAt: new Date() } });
    return res.count === 1 ? prev : null;
  }
}

export async function sendReport(p: Period, opts: { force?: boolean } = {}) {
  const log = await claim(p, opts.force ?? false);
  if (!log) return { sent: false as const, reason: "already-sent" as const };
  try {
    const recipients = await recipientsFor();
    if (!recipients.length) throw new AppError("NO_RECIPIENTS", "No report recipients are configured.", 422);
    const title = p.kind === "WEEKLY" ? "Weekly sales report" : "Monthly sales report";
    const { pdf, analytics: a, tz, currency } = await buildReportPdf(p.from, p.to, title);
    const label = periodLabel(p, tz), brand = await getSetting("brand.name");
    const filename = `${brandConfig.name.toLowerCase().replace(/\s+/g, "-")}-${p.kind.toLowerCase()}-${p.from.toISOString().slice(0, 10)}.pdf`;
    const rows = [["Gross paid revenue", formatMoney(a.grossRevenue, currency)], ["Refunds", formatMoney(a.refunds, currency)], ["Net revenue", formatMoney(a.netRevenue, currency)], ["Successful payments", String(a.successfulPayments)], ["Delivered orders", String(a.deliveredOrders)]];
    const html = layout(title, `<p style="line-height:1.6">Your ${p.kind.toLowerCase()} report for ${esc(label)} is attached.</p><table width="100%" style="font-size:14px">${rows.map(([k, v]) => `<tr><td style="padding:6px 0;color:#77776F">${esc(k)}</td><td align="right">${esc(v)}</td></tr>`).join("")}</table>`);
    const text = `${title} for ${label}\n\n${rows.map(([k, v]) => `${k}: ${v}`).join("\n")}\n\nThe full report is attached as a PDF.`;
    const res = await sendEmail({ to: recipients, template: `report-${p.kind.toLowerCase()}`, subject: `${brand}: ${title} (${label})`, html, text, attachments: [{ filename, content: pdf, contentType: "application/pdf" }] });
    if (!res.ok) throw new AppError("EMAIL_FAILED", res.error ?? "Email could not be sent.", 502);
    await db.reportLog.update({ where: { id: log.id }, data: { status: "SENT", sentTo: recipients.join(", "), sentAt: new Date(), error: null } });
    return { sent: true as const, recipients };
  } catch (e) {
    await db.reportLog.update({ where: { id: log.id }, data: { status: "FAILED", error: e instanceof Error ? e.message.slice(0, 500) : "Unknown error" } }).catch(() => {});
    throw e;
  }
}

/** Called daily by cron. Sends the weekly/monthly report only on the owner's chosen day, once per period. */
export async function runScheduledReports(now = new Date()) {
  const [tz, weeklyOn, monthlyOn, weeklyDay, monthlyDay] = await Promise.all([
    getSetting("reports.timezone"), getSetting("reports.weeklyEnabled"), getSetting("reports.monthlyEnabled"), getSetting("reports.weeklyDay"), getSetting("reports.monthlyDay"),
  ]);
  const p = localParts(now, tz);
  const results: Record<string, string> = {};
  const attempt = async (kind: Kind, due: boolean, enabled: boolean) => {
    if (!enabled) return void (results[kind] = "disabled");
    if (!due) return void (results[kind] = "not-due-today");
    try { const r = await sendReport(completedPeriod(kind, tz, now)); results[kind] = r.sent ? "sent" : "already-sent"; }
    catch (e) { results[kind] = `failed: ${e instanceof Error ? e.message : "error"}`; }
  };
  await attempt("WEEKLY", p.weekday === weeklyDay, weeklyOn);
  await attempt("MONTHLY", p.d === monthlyDay, monthlyOn);
  return results;
}

export { zonedMidnight };
