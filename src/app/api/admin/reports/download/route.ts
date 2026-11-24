import { AppError } from "@/lib/api";
import { adminRoute } from "@/lib/admin-route";
import { reportQuery } from "@/lib/validation/report";
import { getSetting } from "@/services/settings.service";
import { buildReportPdf, completedPeriod } from "@/services/report.service";
import { resolveRange } from "@/utils/tz";

export const runtime = "nodejs";
export const maxDuration = 60;

export const GET = adminRoute(async ({ req }) => {
  const q = reportQuery.safeParse(Object.fromEntries(new URL(req.url).searchParams));
  if (!q.success) throw new AppError("VALIDATION_ERROR", q.error.issues[0]?.message ?? "Invalid report request.", 422);
  const tz = await getSetting("reports.timezone");
  const { kind, offset, from, to } = q.data;
  let range: { from: Date; to: Date }, title: string;
  if (kind === "custom") { range = resolveRange({ range: "custom", from, to }, tz); title = "Sales report"; }
  else { range = completedPeriod(kind === "weekly" ? "WEEKLY" : "MONTHLY", tz, new Date(), offset); title = kind === "weekly" ? "Weekly sales report" : "Monthly sales report"; }
  const { pdf } = await buildReportPdf(range.from, range.to, title);
  return new Response(new Uint8Array(pdf), { headers: { "Content-Type": "application/pdf", "Content-Disposition": `attachment; filename="doveeys-kitchen-${kind}-${range.from.toISOString().slice(0, 10)}.pdf"`, "Cache-Control": "no-store" } });
});
