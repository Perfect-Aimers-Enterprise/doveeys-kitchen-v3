import { PageHeader } from "@/components/admin/ui";
import { SettingsForm } from "@/components/forms/settings-form";
import { getAllSettings } from "@/services/settings.service";

export const metadata = { title: "Report settings" };

export default async function Page() {
  return (
    <>
      <PageHeader title="Report schedule" subtitle="Reports are checked once a day and sent on the day you choose. Each period is sent only once." />
      <SettingsForm settings={await getAllSettings()} fields={[
        { key: "reports.weeklyEnabled", label: "Weekly report", type: "switch" },
        { key: "reports.weeklyDay", label: "Send weekly report on", type: "select", options: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((d, i) => ({ value: String(i), label: d })) },
        { key: "reports.monthlyEnabled", label: "Monthly report", type: "switch" },
        { key: "reports.monthlyDay", label: "Send monthly report on day of month", type: "int", min: 1, max: 28, hint: "A number from 1 to 28." },
        { key: "reports.timezone", label: "Reporting timezone", type: "text", hint: "For example Africa/Lagos. Periods start and end at midnight in this timezone." },
        { key: "reports.recipients", label: "Report recipients", type: "lines", hint: "One address per line. If empty, the order notification recipients are used." },
      ]} />
    </>
  );
}
