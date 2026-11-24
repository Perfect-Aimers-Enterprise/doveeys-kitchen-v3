import { Badge, Card, PageHeader } from "@/components/admin/ui";
import { CopyButton } from "@/components/admin/small-tools";
import { SettingsForm } from "@/components/forms/settings-form";
import { siteConfig } from "@/config";
import { getAllSettings } from "@/services/settings.service";

export const metadata = { title: "Payment settings" };

export default async function Page() {
  const secret = process.env.PAYSTACK_SECRET_KEY ?? "", pub = process.env.PAYSTACK_PUBLIC_KEY ?? "";
  const webhook = `${siteConfig.appUrl.replace(/\/$/, "")}/api/webhooks/paystack`;
  return (
    <>
      <PageHeader title="Payments" subtitle="Payments are processed by Paystack. Orders are only marked paid after the server confirms the payment with Paystack." />
      <div className="max-w-3xl space-y-5">
        <Card title="Paystack connection">
          <ul className="space-y-2 text-sm">
            <li className="flex justify-between"><span>Secret key</span>{secret ? <Badge tone="green">Configured</Badge> : <Badge tone="red">Missing</Badge>}</li>
            <li className="flex justify-between"><span>Public key</span>{pub ? <Badge tone="green">Configured</Badge> : <Badge tone="gray">Not set</Badge>}</li>
            <li className="flex justify-between"><span>Mode</span>{secret ? <Badge tone={secret.startsWith("sk_live") ? "green" : "orange"}>{secret.startsWith("sk_live") ? "Live" : "Test"}</Badge> : <Badge>Unknown</Badge>}</li>
          </ul>
          <p className="mt-3 text-xs text-text-2">Keys are set in environment variables and are never displayed.</p>
        </Card>
        <Card title="Webhook address">
          <p className="mb-2 text-sm text-text-2">In your Paystack dashboard, set this as the webhook URL so payments are confirmed even if a customer closes the page.</p>
          <div className="flex items-center gap-2"><code className="min-w-0 flex-1 break-all rounded-md bg-bg-2 px-3 py-2 text-xs">{webhook}</code><CopyButton value={webhook} label="Copy webhook address" /></div>
        </Card>
        <SettingsForm settings={await getAllSettings()} fields={[{ key: "business.currency", label: "Currency", type: "text", hint: "Three-letter code, for example NGN. Changing this affects new orders only." }]} />
      </div>
    </>
  );
}
