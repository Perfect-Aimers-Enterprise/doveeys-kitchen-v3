import { Card, PageHeader } from "@/components/admin/ui";
import { TestEmail } from "@/components/admin/small-tools";
import { SettingsForm } from "@/components/forms/settings-form";
import { getCurrentAdmin } from "@/lib/auth/session";
import { emailConfigured } from "@/lib/email/transport";
import { getAllSettings } from "@/services/settings.service";

export const metadata = { title: "Email settings" };

export default async function Page() {
  const [settings, admin] = await Promise.all([getAllSettings(), getCurrentAdmin()]);
  return (
    <>
      <PageHeader title="Email" subtitle="New paid orders are emailed to these addresses with a secure link to the order." />
      <div className="max-w-3xl space-y-5">
        <Card title="Server connection">
          <p className="text-sm">{emailConfigured() ? "SMTP is configured through environment variables." : <strong className="text-red-700 dark:text-red-400">SMTP is not configured. Set SMTP_HOST, SMTP_PORT and SMTP_FROM_EMAIL (and credentials) in your environment.</strong>}</p>
          <p className="mt-1 text-xs text-text-2">Passwords stay in environment variables and are never shown here.</p>
          <div className="mt-4"><TestEmail defaultTo={admin?.email ?? ""} /></div>
        </Card>
        <SettingsForm settings={settings} fields={[{ key: "notify.recipients", label: "Order notification recipients", type: "lines", placeholder: "owner@example.com\nmanager@example.com", hint: "One address per line. Both administrators can receive new-order emails." }]} />
      </div>
    </>
  );
}
