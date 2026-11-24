import type { Metadata } from "next";
import { LayoutShell } from "@/components/customer/store";
import { Breadcrumbs } from "@/components/customer/breadcrumbs";
import { JsonLd } from "@/components/shared/json-ld";
import { developerConfig as dev } from "@/config";
import { abs, breadcrumbLd, developerLd, pageMetadata } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  title: `Website Credits: ${dev.name}`,
  description: `DOVEEYS KITCHEN's website, ordering system and administrator dashboard were developed by ${dev.name}, ${dev.companyRole} of ${dev.company}.`,
  path: "/credits", keywords: [dev.name, dev.company, "web developer", "full-stack developer", "AI/ML engineer"],
});

export default function Credits() {
  return (
    <LayoutShell>
      <JsonLd data={[{ "@type": "WebPage", "@id": abs("/credits#page"), url: abs("/credits"), name: `Website credits: ${dev.name}`, about: { "@id": abs("/#developer") }, isPartOf: { "@id": abs("/#website") } }, developerLd(), breadcrumbLd([{ name: "Home", path: "/" }, { name: "Credits", path: "/credits" }])]} />
      <section className="page-wrap">
        <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Credits" }]} />
        <p className="eyebrow">WEBSITE CREDITS</p>
        <h1>Developed by <em>{dev.name}.</em></h1>
        <div style={{ maxWidth: 700, lineHeight: 1.9 }}>
          <p>The DOVEEYS KITCHEN website, online ordering system and administrator dashboard were developed by <strong>{dev.name}</strong>, a {dev.expertise.toLowerCase()}.</p>
          <p>{dev.name} is the {dev.companyRole} of <strong>{dev.company}</strong>.</p>
          <p><a className="text-link" href={dev.portfolioUrl} rel="author noopener" target="_blank">View {dev.name}&apos;s portfolio ↗</a></p>
        </div>
      </section>
    </LayoutShell>
  );
}
