import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { abs } from "@/lib/seo";
import { optimizedUrl } from "@/lib/image-url";

export const dynamic = "force-dynamic"; // reads the live catalogue; never needs the database at build time

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const pages: MetadataRoute.Sitemap = [
    { url: abs("/"), lastModified: now, changeFrequency: "daily", priority: 1 },
    { url: abs("/menu"), lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: abs("/menu/normal"), lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: abs("/menu/special"), lastModified: now, changeFrequency: "daily", priority: 0.8 },
    { url: abs("/about"), changeFrequency: "monthly", priority: 0.6 },
    { url: abs("/faq"), changeFrequency: "monthly", priority: 0.6 },
    { url: abs("/contact"), changeFrequency: "monthly", priority: 0.6 },
    { url: abs("/credits"), changeFrequency: "yearly", priority: 0.3 },
  ];
  try {
    const [meals, categories] = await Promise.all([
      db.meal.findMany({ where: { archivedAt: null }, select: { slug: true, updatedAt: true, imageUrl: true } }),
      db.mealCategory.findMany({ where: { archivedAt: null }, select: { slug: true, updatedAt: true } }),
    ]);
    return [
      ...pages,
      ...categories.map((c) => ({ url: abs(`/menu/category/${c.slug}`), lastModified: c.updatedAt, changeFrequency: "weekly" as const, priority: 0.7 })),
      ...meals.map((m) => ({ url: abs(`/menu/${m.slug}`), lastModified: m.updatedAt, changeFrequency: "weekly" as const, priority: 0.8, ...(m.imageUrl ? { images: [optimizedUrl(m.imageUrl, 1200)!] } : {}) })),
    ];
  } catch {
    return pages;
  }
}
