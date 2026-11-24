import type { Metadata } from "next";
import { LayoutShell } from "@/components/customer/store";
import { Breadcrumbs } from "@/components/customer/breadcrumbs";
import { JsonLd } from "@/components/shared/json-ld";
import { abs, breadcrumbLd, getSiteInfo, pageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = pageMetadata({ title: "Contact Us", description: "Contact DOVEEYS KITCHEN by email, phone or WhatsApp. Questions about an order, a special meal or delivery? We are happy to help.", path: "/contact" });

export default async function Contact() {
  const i = await getSiteInfo();
  const points = [i.phone && { "@type": "ContactPoint", contactType: "customer service", telephone: i.phone }, i.email && { "@type": "ContactPoint", contactType: "customer service", email: i.email }].filter(Boolean) as Record<string, unknown>[];
  return (
    <LayoutShell>
      <JsonLd data={[{ "@type": "ContactPage", "@id": abs("/contact#page"), url: abs("/contact"), name: `Contact ${i.name}`, about: { "@id": abs("/#business") } }, ...(points.length ? [{ "@type": "Organization", "@id": abs("/#business-contact"), name: i.name, url: abs("/"), contactPoint: points }] : []), breadcrumbLd([{ name: "Home", path: "/" }, { name: "Contact", path: "/contact" }])]} />
      <section className="page-wrap">
        <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Contact" }]} />
        <p className="eyebrow">GET IN TOUCH</p>
        <h1>We&apos;re here to <em>help.</em></h1>
        <div className="status">
          {i.email && <p>Email: <a href={`mailto:${i.email}`}>{i.email}</a></p>}
          {i.phone && <p>Phone: <a href={`tel:${i.phone.replace(/\s/g, "")}`}>{i.phone}</a></p>}
          {i.whatsapp && <p>WhatsApp: <a href={`https://wa.me/${i.whatsapp.replace(/\D/g, "")}`} rel="noopener" target="_blank">{i.whatsapp}</a></p>}
          {i.address && <p>Address: {i.address}</p>}
          {i.hours.length > 0 && <div><p>Opening hours</p><ul>{i.hours.map((h) => <li key={h.day}>{h.day}: {h.open} – {h.close}</li>)}</ul></div>}
          {i.social.map((u) => <p key={u}><a href={u} rel="me noopener" target="_blank">{u}</a></p>)}
          {!i.email && !i.phone && !i.whatsapp && !i.address && <p className="muted">Contact details will appear here once they are added in the administrator settings.</p>}
        </div>
      </section>
    </LayoutShell>
  );
}
