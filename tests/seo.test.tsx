import { vi } from "vitest";
vi.mock("../src/lib/db", () => ({ db: {} }));
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { JsonLd } from "../src/components/shared/json-ld";
import { developerLd, openingHoursLd, pageMetadata, productLd, restaurantLd, truncate, websiteLd, type SiteInfo } from "../src/lib/seo";
import { ogImage, optimizedUrl } from "../src/lib/image-url";

const info: SiteInfo = { name: "DOVEEYS KITCHEN", slogan: "", description: "d", logoUrl: "", currency: "NGN", email: "a@b.co", phone: "+234", whatsapp: "", address: "1 Road", about: "", ownerName: "", ownerBio: "", social: ["https://instagram.com/x"], hours: [{ day: "Monday", open: "09:00", close: "18:00" }, { day: "Mon-Fri", open: "9am", close: "5pm" }], footerText: "", announcement: "" };
const normal = { id: "1", slug: "jollof", name: "Jollof", description: "Rice", ingredients: "Rice, pepper", type: "NORMAL" as const, price: "5000.00", options: [], image: "https://res.cloudinary.com/x/image/upload/v1/a.jpg", isAvailable: true, category: { name: "Rice", slug: "rice" } };
const special = { ...normal, id: "2", slug: "soup", type: "SPECIAL" as const, price: null, isAvailable: false, options: [{ id: "a", litres: "1", price: "12000.00" }, { id: "b", litres: "2", price: "23000.00" }] };

describe("structured data", () => {
  it("builds a Product with an Offer for normal meals", () => {
    const p = productLd(normal, info) as any;
    expect(p["@type"]).toBe("Product");
    expect(p.offers).toMatchObject({ "@type": "Offer", price: "5000.00", priceCurrency: "NGN", availability: "https://schema.org/InStock" });
    expect(p.image[0]).toContain("f_auto,q_auto");
    expect(p.additionalProperty[0].value).toBe("Rice, pepper");
  });
  it("builds an AggregateOffer by litre for special meals and reports stock", () => {
    const o = (productLd(special, info) as any).offers;
    expect(o).toMatchObject({ "@type": "AggregateOffer", lowPrice: "12000.00", highPrice: "23000.00", offerCount: 2, availability: "https://schema.org/OutOfStock" });
    expect(o.offers.map((x: any) => x.name)).toEqual(["1 litre", "2 litres"]);
  });
  it("keeps only valid opening hours", () => {
    expect(openingHoursLd(info.hours)).toEqual([{ "@type": "OpeningHoursSpecification", dayOfWeek: "Monday", opens: "09:00", closes: "18:00" }]);
  });
  it("credits the developer and links the portfolio", () => {
    const d = developerLd() as any;
    expect(d.name).toBe("Godsave Kawurem");
    expect(d.url).toBe("https://gktech.gokafood.com");
    expect(d.worksFor.name).toBe("GokaFood Technologies Limited");
    expect(d.jobTitle).toContain("Founder & CEO");
  });
  it("describes the restaurant and a site search", () => {
    expect((restaurantLd(info) as any).sameAs).toEqual(["https://instagram.com/x"]);
    expect((websiteLd(info) as any).potentialAction.target.urlTemplate).toContain("/menu?q={search_term_string}");
  });
  it("escapes script-closing sequences in JSON-LD", () => {
    const html = renderToStaticMarkup(<JsonLd data={{ "@type": "Thing", name: "</script><script>alert(1)</script>" }} />);
    expect(html).not.toContain("</script><script>");
    expect(html).toContain("\\u003c/script>");
  });
});

describe("metadata helpers", () => {
  it("sets canonical, Open Graph and Twitter consistently", () => {
    const m = pageMetadata({ title: "Menu", description: "x".repeat(300), path: "/menu", image: "https://img/x.jpg" }) as any;
    expect(m.alternates.canonical).toMatch(/\/menu$/);
    expect(m.description.length).toBeLessThanOrEqual(160);
    expect(m.openGraph.images[0].url).toBe("https://img/x.jpg");
    expect(m.twitter.card).toBe("summary_large_image");
  });
  it("noindex flag disables indexing", () => expect((pageMetadata({ title: "t", description: "d", path: "/x", noindex: true }) as any).robots.index).toBe(false));
  it("truncates on a word boundary", () => expect(truncate("one two three four", 10)).toBe("one two…"));
  it("transforms only Cloudinary urls", () => {
    expect(optimizedUrl("https://res.cloudinary.com/c/image/upload/v1/a.jpg", 600)).toContain("w_600");
    expect(optimizedUrl("https://example.com/a.jpg")).toBe("https://example.com/a.jpg");
    expect(ogImage("https://res.cloudinary.com/c/image/upload/v1/a.jpg")).toContain("w_1200,h_630");
  });
});
