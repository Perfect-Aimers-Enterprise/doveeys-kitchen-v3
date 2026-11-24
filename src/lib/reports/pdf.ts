import PDFDocument from "pdfkit";
import { brandConfig } from "@/config";
import type { Analytics } from "@/services/analytics.service";

const GREEN = "#245C37", DEEP = "#173F29", ORANGE = "#D99035", TEXT = "#22251F", MUTED = "#77776F", BORDER = "#E6E3D9", CREAM = "#F2F0E8";
const M = 50;

export type ReportMeta = { title: string; periodLabel: string; generatedLabel: string; currency: string; timezone: string; brandName?: string };

/** Branded A4 report. Uses PDF built-in fonts (Times for headings, Helvetica for body) so no font files ship with the app. */
export function renderReportPdf(a: Analytics, meta: ReportMeta): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: M, bufferPages: true, info: { Title: `${meta.brandName ?? brandConfig.name} ${meta.title}`, Author: meta.brandName ?? brandConfig.name } });
    const chunks: Buffer[] = [];
    doc.on("data", (c: Buffer) => chunks.push(c));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const W = doc.page.width - M * 2;
    // Built-in PDF fonts lack currency glyphs such as the naira sign, so amounts use the ISO code (e.g. NGN 1,500.00).
    const money = (v: string) => `${meta.currency} ${Number(v).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    const ensure = (h: number) => { if (doc.y + h > doc.page.height - 70) doc.addPage(); };
    const h2 = (t: string) => { ensure(60); doc.moveDown(1.2).font("Times-Bold").fontSize(16).fillColor(DEEP).text(t, M); doc.moveTo(M, doc.y + 3).lineTo(M + 36, doc.y + 3).lineWidth(2).strokeColor(ORANGE).stroke(); doc.moveDown(0.8); };

    // Header
    doc.font("Times-Bold").fontSize(26).fillColor(DEEP).text((meta.brandName ?? brandConfig.name).toUpperCase(), M, M, { characterSpacing: 2 });
    doc.rect(M, doc.y + 4, 48, 3).fill(ORANGE);
    doc.moveDown(1.2).font("Times-Roman").fontSize(20).fillColor(TEXT).text(meta.title);
    doc.font("Helvetica").fontSize(10).fillColor(MUTED).text(`Reporting period: ${meta.periodLabel}`).text(`Generated: ${meta.generatedLabel} (${meta.timezone})`);

    // Financial summary cards (2 x 4)
    h2("Financial summary");
    const cards: [string, string][] = [
      ["Gross paid revenue", money(a.grossRevenue)], ["Refunds", money(a.refunds)], ["Net revenue", money(a.netRevenue)], ["Average order value", money(a.averageOrderValue)],
      ["Successful payments", String(a.successfulPayments)], ["Delivered orders", String(a.deliveredOrders)], ["Cancelled orders", String(a.cancelledOrders)], ["Pending fulfilment", String(a.pendingFulfilment)],
    ];
    const cw = (W - 10) / 2, ch = 46;
    ensure(ch * 4 + 30);
    const top = doc.y;
    cards.forEach(([label, value], i) => {
      const x = M + (i % 2) * (cw + 10), y = top + Math.floor(i / 2) * (ch + 8);
      doc.rect(x, y, cw, ch).fill(CREAM);
      doc.font("Helvetica").fontSize(8.5).fillColor(MUTED).text(label.toUpperCase(), x + 12, y + 9, { width: cw - 24, characterSpacing: 0.6 });
      doc.font("Helvetica-Bold").fontSize(14).fillColor(TEXT).text(value, x + 12, y + 22, { width: cw - 24 });
    });
    doc.y = top + 4 * (ch + 8);
    doc.font("Helvetica").fontSize(8.5).fillColor(MUTED).text("Only verified, successfully paid orders count as sales. Refunds are the amounts recorded against those orders.", M, doc.y + 2, { width: W });

    // Table helper
    const table = (cols: { h: string; w: number; align?: "left" | "right" }[], rows: string[][], empty: string) => {
      if (!rows.length) { doc.font("Helvetica-Oblique").fontSize(10).fillColor(MUTED).text(empty, M); return; }
      const drawHead = () => {
        const y = doc.y; doc.rect(M, y, W, 20).fill(DEEP);
        let x = M; cols.forEach((c) => { doc.font("Helvetica-Bold").fontSize(8.5).fillColor("#FFFFFF").text(c.h.toUpperCase(), x + 8, y + 6, { width: c.w - 16, align: c.align ?? "left", characterSpacing: 0.5 }); x += c.w; });
        doc.y = y + 20;
      };
      drawHead();
      rows.forEach((r, n) => {
        if (doc.y + 22 > doc.page.height - 70) { doc.addPage(); drawHead(); }
        const y = doc.y; if (n % 2) doc.rect(M, y, W, 22).fill("#FAF9F5");
        let x = M; cols.forEach((c, i) => { doc.font("Helvetica").fontSize(9.5).fillColor(TEXT).text(r[i], x + 8, y + 6, { width: c.w - 16, align: c.align ?? "left", lineBreak: false, ellipsis: true }); x += c.w; });
        doc.moveTo(M, y + 22).lineTo(M + W, y + 22).lineWidth(0.5).strokeColor(BORDER).stroke(); doc.y = y + 22;
      });
    };

    h2("Revenue by meal type");
    table([{ h: "Type", w: W * 0.5 }, { h: "Revenue (excl. delivery)", w: W * 0.5, align: "right" }], [["Normal meals", money(a.normalRevenue)], ["Special meals", money(a.specialRevenue)]], "No sales in this period.");

    h2("Best-selling meals");
    table([{ h: "#", w: 34 }, { h: "Meal", w: W - 34 - 150 }, { h: "Qty", w: 60, align: "right" }, { h: "Revenue", w: 90, align: "right" }], a.bestSellers.map((b, i) => [String(i + 1), b.name, String(b.quantity), money(b.revenue)]), "No meals sold in this period.");

    h2("Special meals: litre distribution");
    table([{ h: "Litres", w: W * 0.34 }, { h: "Quantity sold", w: W * 0.33, align: "right" }, { h: "Revenue", w: W * 0.33, align: "right" }], a.litreDistribution.map((l) => [`${l.litres} L`, String(l.quantity), money(l.revenue)]), "No special meals sold in this period.");

    h2("Order status distribution");
    table([{ h: "Status", w: W * 0.6 }, { h: "Orders", w: W * 0.4, align: "right" }], a.statusDistribution.map((s) => [s.status.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase()), String(s.count)]), "No orders placed in this period.");

    // Trend chart (daily revenue bars)
    h2("Order and revenue trend");
    const chartH = 120; ensure(chartH + 50);
    const base = doc.y + chartH, max = Math.max(1, ...a.trend.map((t) => Number(t.revenue)));
    const n = a.trend.length, gap = n > 40 ? 0.5 : 2, bw = Math.max(1, (W - gap * (n - 1)) / Math.max(n, 1));
    doc.rect(M, doc.y, W, chartH).fill("#FAF9F5");
    a.trend.forEach((t, i) => { const h = (Number(t.revenue) / max) * (chartH - 16); if (h > 0) doc.rect(M + i * (bw + gap), base - h, bw, h).fill(GREEN); });
    doc.moveTo(M, base).lineTo(M + W, base).lineWidth(0.7).strokeColor(BORDER).stroke();
    doc.font("Helvetica").fontSize(8).fillColor(MUTED).text(a.trend[0]?.day ?? "", M, base + 4, { width: W / 2 }).text(a.trend.at(-1)?.day ?? "", M + W / 2, base + 4, { width: W / 2, align: "right" });
    doc.text(`Daily paid revenue. Peak day: ${money(String(max === 1 && !a.trend.some((t) => Number(t.revenue) > 0) ? 0 : max))}. Total orders in the period: ${a.trend.reduce((s, t) => s + t.orders, 0)}.`, M, base + 18, { width: W });
    doc.y = base + 40;

    // Footer + page numbers on every page
    const range = doc.bufferedPageRange();
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i);
      doc.page.margins.bottom = 0; // footer sits inside the bottom margin; without this pdfkit appends blank pages
      doc.moveTo(M, doc.page.height - 52).lineTo(M + W, doc.page.height - 52).lineWidth(0.5).strokeColor(BORDER).stroke();
      doc.font("Helvetica").fontSize(8).fillColor(MUTED)
        .text(`${meta.brandName ?? brandConfig.name} · ${meta.title} · ${meta.periodLabel}`, M, doc.page.height - 44, { width: W - 80, lineBreak: false })
        .text(`Page ${i + 1} of ${range.count}`, M + W - 80, doc.page.height - 44, { width: 80, align: "right", lineBreak: false });
    }
    doc.end();
  });
}
