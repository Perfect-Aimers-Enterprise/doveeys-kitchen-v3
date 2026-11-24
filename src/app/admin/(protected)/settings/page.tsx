import Link from "next/link";
import { Building2, CreditCard, FileText, HelpCircle, Mail, Truck } from "lucide-react";
import { Badge, PageHeader } from "@/components/admin/ui";
import { emailConfigured } from "@/lib/email/transport";
import { getAllSettings } from "@/services/settings.service";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const s = await getAllSettings();
  const key = process.env.PAYSTACK_SECRET_KEY ?? "";
  const cards = [
    { href: "/admin/settings/business", Icon: Building2, title: "Business & brand", text: "Name, contact details, about, owner, hours, social links, footer and announcement.", chip: null },
    { href: "/admin/settings/email", Icon: Mail, title: "Email", text: "Who is notified about new paid orders, and a test email.", chip: emailConfigured() ? <Badge tone="green">SMTP configured</Badge> : <Badge tone="red">SMTP not configured</Badge> },
    { href: "/admin/settings/payments", Icon: CreditCard, title: "Payments", text: "Paystack status, webhook address and currency.", chip: key ? <Badge tone={key.startsWith("sk_live") ? "green" : "orange"}>{key.startsWith("sk_live") ? "Live mode" : "Test mode"}</Badge> : <Badge tone="red">Key missing</Badge> },
    { href: "/admin/settings/delivery", Icon: Truck, title: "Delivery", text: "Default fee, free-delivery threshold, instructions and delivery areas.", chip: <Badge>Fee {String(s["delivery.defaultFee"].value)}</Badge> },
    { href: "/admin/settings/reports", Icon: FileText, title: "Reports", text: "Weekly and monthly schedule, recipients and timezone.", chip: null },
    { href: "/admin/settings/faqs", Icon: HelpCircle, title: "FAQs", text: "Questions and answers shown on the website.", chip: null },
  ];
  return (
    <>
      <PageHeader title="Settings" subtitle="Everything here can be changed without touching code. Clear a value to go back to its default." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ href, Icon, title, text, chip }) => (
          <Link key={href} href={href} className="group rounded-lg border border-border bg-card p-5 transition-colors hover:border-green">
            <div className="flex items-start justify-between"><Icon size={22} className="text-green" aria-hidden />{chip}</div>
            <h2 className="mt-4 text-xl font-semibold">{title}</h2><p className="mt-1 text-sm text-text-2">{text}</p>
          </Link>
        ))}
      </div>
    </>
  );
}
