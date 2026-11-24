import type { Metadata } from "next";
import Link from "next/link";
import { LayoutShell, MealCard } from "@/components/customer/store";
import { Breadcrumbs } from "@/components/customer/breadcrumbs";
import { JsonLd } from "@/components/shared/json-ld";
import { listPublicCategories, listPublicMeals } from "@/services/catalog.service";
import { breadcrumbLd, itemListLd, pageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
type Props = { searchParams: Promise<{ q?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = await searchParams;
  // Search result pages are thin duplicates of /menu, so keep them out of the index.
  return pageMetadata({ title: "Menu: Meals & Special Orders", description: "Browse the full DOVEEYS KITCHEN menu: everyday meals and special dishes by the litre. Order online and pay securely.", path: "/menu", noindex: Boolean(q) });
}

export default async function Menu({ searchParams }: Props) {
  const q = (await searchParams).q?.trim().slice(0, 80);
  let meals: Awaited<ReturnType<typeof listPublicMeals>> = [];
  let categories: Awaited<ReturnType<typeof listPublicCategories>> = [];
  try { [meals, categories] = await Promise.all([listPublicMeals({ q }), listPublicCategories()]); } catch { /* show empty state */ }
  const crumbs = [{ name: "Home", href: "/" }, { name: "Menu" }];
  return (
    <LayoutShell>
      <JsonLd data={[breadcrumbLd([{ name: "Home", path: "/" }, { name: "Menu", path: "/menu" }]), itemListLd(meals, "DOVEEYS KITCHEN menu", "/menu")]} />
      <section className="page-wrap">
        <Breadcrumbs items={crumbs} />
        <p className="eyebrow">THE MENU</p>
        <h1>Made to be <em>savoury.</em></h1>
        <p className="muted">Explore meals crafted for everyday enjoyment and special moments.</p>
        <form action="/menu" role="search" style={{ margin: "24px 0", maxWidth: 420 }}>
          <label htmlFor="q" className="tiny muted">SEARCH THE MENU</label>
          <input id="q" name="q" defaultValue={q} className="search-input" placeholder="Search meals" />
        </form>
        <nav aria-label="Menu sections" style={{ display: "flex", gap: 22, margin: "30px 0", flexWrap: "wrap" }}>
          <Link className="text-link" href="/menu">All meals</Link>
          <Link className="text-link" href="/menu/normal">Normal meals</Link>
          <Link className="text-link" href="/menu/special">Special meals</Link>
          {categories.filter((c) => c.mealCount > 0).map((c) => <Link key={c.id} className="text-link" href={`/menu/category/${c.slug}`}>{c.name}</Link>)}
        </nav>
        <div className="listing-grid">{meals.map((m) => <MealCard key={m.id} meal={m} />)}</div>
        {!meals.length && <p>{q ? `No meals match “${q}”.` : "No meals currently listed."}</p>}
      </section>
    </LayoutShell>
  );
}
