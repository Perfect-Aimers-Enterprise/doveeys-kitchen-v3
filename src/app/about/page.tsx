import type { Metadata } from "next";
import { LayoutShell } from "@/components/customer/store";
import { Breadcrumbs } from "@/components/customer/breadcrumbs";
import { JsonLd } from "@/components/shared/json-ld";
import { abs, breadcrumbLd, getSiteInfo, pageMetadata, truncate } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const i = await getSiteInfo();
  return pageMetadata({ title: "Our Story", description: i.about ? truncate(i.about, 150) : `Learn about ${i.name}: how we cook, what we care about and who is behind the kitchen.`, path: "/about" });
}

export default async function About() {
  const i = await getSiteInfo();
  return (
    <LayoutShell>
      <JsonLd data={[{ "@type": "AboutPage", "@id": abs("/about#page"), url: abs("/about"), name: `About ${i.name}`, about: { "@id": abs("/#business") }, isPartOf: { "@id": abs("/#website") } }, breadcrumbLd([{ name: "Home", path: "/" }, { name: "Our Story", path: "/about" }])]} />
      <section className="page-wrap">
        <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Our Story" }]} />
        <p className="eyebrow">ABOUT DOVEEYS KITCHEN</p>
        <h1>A little about<br /><em>our kitchen.</em></h1>
        {i.about ? <p style={{ maxWidth: 700, lineHeight: 2, whiteSpace: "pre-line" }}>{i.about}</p> : <p className="muted">Our story and culinary philosophy will appear here as the business profile is configured.</p>}
        {i.ownerName && <section style={{ marginTop: 45 }}><h2>{i.ownerName}</h2>{i.ownerBio && <p style={{ maxWidth: 700, lineHeight: 1.9, whiteSpace: "pre-line" }}>{i.ownerBio}</p>}</section>}
      </section>
    </LayoutShell>
  );
}
