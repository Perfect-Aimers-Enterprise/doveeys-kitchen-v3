import { fail, ok } from "@/lib/api";
import { db } from "@/lib/db";
import { faqConfig, seoConfig } from "@/config";
import { getAllSettings } from "@/services/settings.service";
import { listActiveZones } from "@/services/delivery.service";
import { toMoneyString } from "@/utils/money";

export const runtime = "nodejs";

/** Whitelisted, non-secret configuration only. Never add credentials or administrator data here. */
export async function GET() {
  try {
    const [s, zones, faqs] = await Promise.all([getAllSettings(), listActiveZones(), db.faq.findMany({ orderBy: { sortOrder: "asc" } })]);
    const v = (k: string) => s[k].value as never;
    const social: Record<string, string> = {};
    for (const k of ["instagram", "facebook", "x", "tiktok"]) { const val = s[`social.${k}`].value as string; if (val) social[k] = val; }
    const threshold = v("delivery.freeThreshold") as string | null;
    return ok({
      brand: { name: v("brand.name"), slogan: v("brand.slogan"), description: v("brand.description"), logoUrl: v("brand.logoUrl") },
      seo: { title: seoConfig.title, description: seoConfig.description, ogImage: seoConfig.ogImage },
      contact: { email: v("contact.email"), phone: v("contact.phone"), whatsapp: v("contact.whatsapp") },
      address: v("business.address"), social, operatingHours: v("business.hours"), about: v("business.about"),
      owner: { name: v("business.ownerName"), bio: v("business.ownerBio") },
      announcement: v("site.announcement"), footer: { text: v("footer.text") }, currency: v("business.currency"), theme: v("theme.default"),
      delivery: {
        defaultFee: toMoneyString(v("delivery.defaultFee")), freeThreshold: threshold ? toMoneyString(threshold) : null, instructions: v("delivery.instructions"),
        zones: zones.map((z) => ({ id: z.id, name: z.name, fee: toMoneyString(z.fee) })),
      },
      faqs: faqs.length ? faqs.map((f) => ({ id: f.id, question: f.question, answer: f.answer })) : faqConfig.items.map((f, i) => ({ id: String(i), ...f })),
    });
  } catch (e) { return fail(e); }
}
