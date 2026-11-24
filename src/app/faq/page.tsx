import type { Metadata } from "next";
import { LayoutShell } from "@/components/customer/store";
import { Breadcrumbs } from "@/components/customer/breadcrumbs";
import { JsonLd } from "@/components/shared/json-ld";
import { faqConfig } from "@/config";
import { db } from "@/lib/db";
import { breadcrumbLd, faqLd, pageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata: Metadata = pageMetadata({ title: "Frequently Asked Questions", description: "Answers to common questions about ordering from DOVEEYS KITCHEN: payment, delivery, special meals by the litre and order tracking.", path: "/faq" });

export default async function FAQ() {
  let items: { id?: string; question: string; answer: string }[] = [...faqConfig.items];
  try { const f = await db.faq.findMany({ orderBy: { sortOrder: "asc" } }); if (f.length) items = f; } catch { /* use config defaults */ }
  return (
    <LayoutShell>
      <JsonLd data={[...(items.length ? [faqLd(items)] : []), breadcrumbLd([{ name: "Home", path: "/" }, { name: "FAQs", path: "/faq" }])]} />
      <section className="page-wrap">
        <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "FAQs" }]} />
        <p className="eyebrow">A FEW ANSWERS</p>
        <h1>Frequently <em>asked.</em></h1>
        {items.map((x, n) => (
          <details className="faq-item" key={x.id ?? n}>
            <summary style={{ cursor: "pointer", fontSize: 18, fontFamily: "var(--font-heading)" }}>{x.question}</summary>
            <p style={{ lineHeight: 1.8, color: "var(--muted)" }}>{x.answer}</p>
          </details>
        ))}
        {!items.length && <p className="muted">Answers to common questions will appear here soon.</p>}
      </section>
    </LayoutShell>
  );
}
