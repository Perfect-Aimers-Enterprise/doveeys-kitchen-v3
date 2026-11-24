import type { Metadata } from "next";
import { brandConfig, businessConfig, contactConfig, developerConfig, footerConfig, seoConfig, siteConfig } from "@/config";
import { getAllSettings } from "@/services/settings.service";
import { optimizedUrl } from "@/lib/image-url";

export const baseUrl = siteConfig.appUrl.replace(/\/$/, "");
export const abs = (path = "/") => `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
export const truncate = (s: string, max = 155) => { const t = s.replace(/\s+/g, " ").trim(); return t.length <= max ? t : `${t.slice(0, max - 1).replace(/\s+\S*$/, "")}…`; };

export const DEFAULT_DESCRIPTION = "Order thoughtfully prepared meals and special litre-sized dishes online from DOVEEYS KITCHEN. Pay securely, then track your order from payment to delivery.";
export const DEFAULT_KEYWORDS = ["DOVEEYS KITCHEN", "order food online", "special meals by litre", "meal delivery", "online food ordering", "pay online food order"];

export type SiteInfo = {
  name: string; slogan: string; description: string; logoUrl: string; currency: string;
  email: string; phone: string; whatsapp: string; address: string; about: string; ownerName: string; ownerBio: string;
  social: string[]; hours: { day: string; open: string; close: string }[]; footerText: string; announcement: string;
};

/** Owner-editable values with config fallbacks. Never throws: SEO output must survive a database outage. */
export async function getSiteInfo(): Promise<SiteInfo> {
  let s: Awaited<ReturnType<typeof getAllSettings>> | null = null;
  try { s = await getAllSettings(); } catch { /* fall back to config */ }
  const v = <T,>(key: string, fallback: T): T => (s ? (s[key].value as T) : fallback);
  return {
    name: v("brand.name", brandConfig.name), slogan: v("brand.slogan", brandConfig.slogan), description: v("brand.description", brandConfig.description) || seoConfig.description || DEFAULT_DESCRIPTION,
    logoUrl: v("brand.logoUrl", brandConfig.logoUrl), currency: v("business.currency", businessConfig.currency),
    email: v("contact.email", contactConfig.email), phone: v("contact.phone", contactConfig.phone), whatsapp: v("contact.whatsapp", contactConfig.whatsapp),
    address: v("business.address", businessConfig.address), about: v("business.about", businessConfig.about),
    ownerName: v("business.ownerName", businessConfig.owner.name), ownerBio: v("business.ownerBio", businessConfig.owner.bio),
    social: ["instagram", "facebook", "x", "tiktok"].map((k) => v(`social.${k}`, "")).filter(Boolean),
    hours: v("business.hours", [] as SiteInfo["hours"]), footerText: v("footer.text", footerConfig.text), announcement: v("site.announcement", siteConfig.announcement),
  };
}

type PageMeta = { title: string; description: string; path: string; image?: string | null; keywords?: string[]; noindex?: boolean };

/** One place that produces canonical, Open Graph and Twitter tags so every page is consistent. */
export function pageMetadata(o: PageMeta): Metadata {
  const url = abs(o.path);
  const description = truncate(o.description, 160);
  return {
    title: o.title, description, keywords: o.keywords, alternates: { canonical: url },
    openGraph: { type: "website", url, title: o.title, description, siteName: brandConfig.name, locale: "en_NG", ...(o.image ? { images: [{ url: o.image, width: 1200, height: 630, alt: o.title }] } : {}) },
    twitter: { card: "summary_large_image", title: o.title, description, ...(o.image ? { images: [o.image] } : {}) },
    ...(o.noindex ? { robots: { index: false, follow: false } } : {}),
  };
}

/* ---------- JSON-LD builders ---------- */
const DAY: Record<string, string> = { mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday" };

export function openingHoursLd(hours: SiteInfo["hours"]) {
  return hours.flatMap((h) => {
    const day = DAY[h.day.trim().slice(0, 3).toLowerCase()];
    return day && /^\d{1,2}:\d{2}/.test(h.open) && /^\d{1,2}:\d{2}/.test(h.close) ? [{ "@type": "OpeningHoursSpecification", dayOfWeek: day, opens: h.open, closes: h.close }] : [];
  });
}

export const developerLd = () => ({
  "@type": "Person", "@id": abs("/#developer"), name: developerConfig.name, url: developerConfig.portfolioUrl, sameAs: [developerConfig.portfolioUrl],
  jobTitle: `${developerConfig.companyRole}, ${developerConfig.company}`, description: `${developerConfig.expertise}. ${developerConfig.companyRole} of ${developerConfig.company}.`,
  worksFor: { "@type": "Organization", "@id": abs("/#gokafood-technologies"), name: developerConfig.company, url: developerConfig.portfolioUrl, founder: { "@id": abs("/#developer") } },
});

export function restaurantLd(i: SiteInfo) {
  const hours = openingHoursLd(i.hours);
  return {
    "@type": "Restaurant", "@id": abs("/#business"), name: i.name, url: baseUrl, description: i.description,
    ...(i.logoUrl ? { logo: i.logoUrl, image: i.logoUrl } : {}), ...(i.phone ? { telephone: i.phone } : {}), ...(i.email ? { email: i.email } : {}),
    ...(i.address ? { address: { "@type": "PostalAddress", streetAddress: i.address } } : {}), ...(i.social.length ? { sameAs: i.social } : {}),
    ...(hours.length ? { openingHoursSpecification: hours } : {}), hasMenu: abs("/menu"), currenciesAccepted: i.currency, paymentAccepted: "Online payment via Paystack",
    potentialAction: { "@type": "OrderAction", target: { "@type": "EntryPoint", urlTemplate: abs("/menu"), actionPlatform: ["http://schema.org/DesktopWebPlatform", "http://schema.org/MobileWebPlatform"] }, deliveryMethod: "http://purl.org/goodrelations/v1#DeliveryModeOwnFleet" },
  };
}

export const websiteLd = (i: SiteInfo) => ({
  "@type": "WebSite", "@id": abs("/#website"), url: baseUrl, name: i.name, inLanguage: "en", publisher: { "@id": abs("/#business") }, creator: { "@id": abs("/#developer") },
  potentialAction: { "@type": "SearchAction", target: { "@type": "EntryPoint", urlTemplate: `${baseUrl}/menu?q={search_term_string}` }, "query-input": "required name=search_term_string" },
});

export const breadcrumbLd = (items: { name: string; path: string }[]) => ({
  "@type": "BreadcrumbList", itemListElement: items.map((it, n) => ({ "@type": "ListItem", position: n + 1, name: it.name, item: abs(it.path) })),
});

export const faqLd = (items: { question: string; answer: string }[]) => ({
  "@type": "FAQPage", mainEntity: items.map((f) => ({ "@type": "Question", name: f.question, acceptedAnswer: { "@type": "Answer", text: f.answer } })),
});

type MealLike = { id: string; slug: string; name: string; description: string; ingredients?: string | null; type: "NORMAL" | "SPECIAL"; price: string | null; options: { id: string; litres: string; price: string }[]; image?: string | null; isAvailable: boolean; category?: { name: string; slug: string } | null };

export const litreLabel = (l: string) => `${l} litre${l === "1" ? "" : "s"}`;
export const lowestPrice = (m: MealLike) => (m.type === "NORMAL" ? m.price : [...m.options].sort((a, b) => Number(a.price) - Number(b.price))[0]?.price ?? null);

export function itemListLd(meals: MealLike[], name: string, path: string) {
  return { "@type": "ItemList", name, url: abs(path), numberOfItems: meals.length, itemListElement: meals.map((m, n) => ({ "@type": "ListItem", position: n + 1, url: abs(`/menu/${m.slug}`), name: m.name, ...(m.image ? { image: optimizedUrl(m.image, 800) } : {}) })) };
}

export function productLd(m: MealLike, i: SiteInfo) {
  const url = abs(`/menu/${m.slug}`);
  const availability = m.isAvailable ? "https://schema.org/InStock" : "https://schema.org/OutOfStock";
  const seller = { "@id": abs("/#business") };
  let offers: Record<string, unknown> | undefined;
  if (m.type === "NORMAL" && m.price) offers = { "@type": "Offer", url, price: m.price, priceCurrency: i.currency, availability, seller };
  else if (m.options.length) {
    const prices = m.options.map((o) => Number(o.price));
    offers = {
      "@type": "AggregateOffer", priceCurrency: i.currency, lowPrice: Math.min(...prices).toFixed(2), highPrice: Math.max(...prices).toFixed(2), offerCount: m.options.length, availability, seller,
      offers: m.options.map((o) => ({ "@type": "Offer", name: litreLabel(o.litres), url, price: o.price, priceCurrency: i.currency, availability, seller })),
    };
  }
  return {
    "@type": "Product", "@id": `${url}#product`, url, name: m.name, description: m.description, sku: m.slug,
    ...(m.image ? { image: [optimizedUrl(m.image, 1200)] } : {}), ...(m.category ? { category: m.category.name } : {}),
    brand: { "@type": "Brand", name: i.name }, ...(offers ? { offers } : {}),
    ...(m.ingredients ? { additionalProperty: [{ "@type": "PropertyValue", name: "Ingredients", value: m.ingredients }] } : {}),
  };
}
