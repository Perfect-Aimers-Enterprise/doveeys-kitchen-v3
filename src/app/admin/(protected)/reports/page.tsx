import Link from "next/link";
import { Badge, Card, Empty, PageHeader, Table, Td, Th, btnGhost, btnPrimary, inputCls } from "@/components/admin/ui";
import { ReportActions } from "@/components/admin/report-actions";
import { db } from "@/lib/db";
import { completedPeriod, periodLabel } from "@/services/report.service";
import { getAllSettings } from "@/services/settings.service";
import { fmtDateTime, titleCase } from "@/utils/format";
import { addLocalDays } from "@/utils/tz";

export const metadata = { title: "Reports" };
const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default async function ReportsPage() {
  const s = await getAllSettings();
  const tz = s["reports.timezone"].value as string;
  const weekly = completedPeriod("WEEKLY", tz), monthly = completedPeriod("MONTHLY", tz);
  const logs = await db.reportLog.findMany({ orderBy: { createdAt: "desc" }, take: 20 });
  const recipients = (s["reports.recipients"].value as string[]).length ? (s["reports.recipients"].value as string[]) : (s["notify.recipients"].value as string[]);
  const today = new Date().toISOString().slice(0, 10), weekAgo = addLocalDays(new Date(), -6, tz).toISOString().slice(0, 10);
  return (
    <>
      <PageHeader title="Reports" subtitle="Branded PDF reports. Only verified paid orders count as sales, and refunds are subtracted for net revenue." actions={<Link href="/admin/settings/reports" className={btnGhost}>Schedule settings</Link>} />
      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Weekly report"><ReportActions kind="WEEKLY" label={`Last complete week: ${periodLabel(weekly, tz)}`} /></Card>
        <Card title="Monthly report"><ReportActions kind="MONTHLY" label={`Last complete month: ${periodLabel(monthly, tz)}`} /></Card>
      </div>

      <Card title="Custom range" className="mt-4">
        <form action="/api/admin/reports/download" className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="kind" value="custom" />
          <label className="text-sm">From<input type="date" name="from" required defaultValue={weekAgo} className={`${inputCls} mt-1 w-44`} /></label>
          <label className="text-sm">To<input type="date" name="to" required defaultValue={today} className={`${inputCls} mt-1 w-44`} /></label>
          <button className={btnPrimary}>Download PDF</button>
        </form>
      </Card>

      <Card title="Automatic schedule" className="mt-4">
        <ul className="space-y-1 text-sm">
          <li>Weekly: {s["reports.weeklyEnabled"].value ? <>every <strong>{DAYS[s["reports.weeklyDay"].value as number]}</strong></> : "off"}</li>
          <li>Monthly: {s["reports.monthlyEnabled"].value ? <>on day <strong>{String(s["reports.monthlyDay"].value)}</strong> of each month</> : "off"}</li>
          <li>Timezone: {tz} · Recipients: {recipients.length ? recipients.join(", ") : <span className="text-red-700 dark:text-red-400">none set, nothing can be emailed</span>}</li>
        </ul>
      </Card>

      <h2 className="mb-3 mt-8 text-xl font-semibold">History</h2>
      {logs.length === 0 ? <Empty title="No reports sent yet" text="Emailed reports are listed here." /> : (
        <Table>
          <thead><tr><Th>Type</Th><Th>Period</Th><Th>Status</Th><Th className="hidden md:table-cell">Sent to</Th><Th className="hidden sm:table-cell">When</Th></tr></thead>
          <tbody>{logs.map((l) => (
            <tr key={l.id}><Td>{titleCase(l.kind)}</Td><Td>{periodLabel({ from: l.periodStart, to: l.periodEnd }, tz)}</Td>
              <Td><Badge tone={l.status === "SENT" ? "green" : l.status === "FAILED" ? "red" : "gray"}>{titleCase(l.status)}</Badge>{l.error && <div className="mt-1 max-w-xs text-xs text-red-700 dark:text-red-400">{l.error}</div>}</Td>
              <Td className="hidden md:table-cell">{l.sentTo ?? "—"}</Td><Td className="hidden sm:table-cell">{fmtDateTime(l.sentAt ?? l.createdAt, tz)}</Td></tr>
          ))}</tbody>
        </Table>
      )}
    </>
  );
}
