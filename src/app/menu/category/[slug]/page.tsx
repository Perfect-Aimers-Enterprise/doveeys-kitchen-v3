import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LayoutShell, MealCard } from "@/components/customer/store";
import { Breadcrumbs } from "@/components/customer/breadcrumbs";
import { JsonLd } from "@/components/shared/json-ld";
import { listPublicCategories, listPublicMeals } from "@/services/catalog.service";
import { breadcrumbLd, itemListLd, pageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
type Props = { params: Promise<{ slug: string }> };

async function load(slug: string) {
  try {
    const category = (await listPublicCategories()).find((c) => c.slug === slug);
    return category ? { category, meals: await listPublicMeals({ category: slug }) } : null;
  } catch { return null; }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await load(slug);
  if (!data) return { title: "Category not found", robots: { index: false, follow: false } };
  return pageMetadata({ title: `${data.category.name} Meals`, description: `Order ${data.category.name.toLowerCase()} from DOVEEYS KITCHEN online. ${data.meals.length} meal${data.meals.length === 1 ? "" : "s"} with secure payment and order tracking.`, path: `/menu/category/${slug}`, noindex: data.meals.length === 0 });
}

export default async function CategoryPage({ params }: Props) {
  const { slug } = await params;
  const data = await load(slug);
  if (!data) notFound();
  const path = `/menu/category/${slug}`;
  return (
    <LayoutShell>
      <JsonLd data={[breadcrumbLd([{ name: "Home", path: "/" }, { name: "Menu", path: "/menu" }, { name: data.category.name, path }]), itemListLd(data.meals, data.category.name, path)]} />
      <section className="page-wrap">
        <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Menu", href: "/menu" }, { name: data.category.name }]} />
        <p className="eyebrow">CATEGORY</p>
        <h1>{data.category.name}</h1>
        <div className="listing-grid" style={{ marginTop: 35 }}>{data.meals.map((m) => <MealCard key={m.id} meal={m} />)}</div>
        {!data.meals.length && <p className="muted">No meals currently listed in this category.</p>}
      </section>
    </LayoutShell>
  );
}
