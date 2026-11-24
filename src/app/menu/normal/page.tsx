import Link from "next/link";
import { LayoutShell, MealCard } from "@/components/customer/store";
import { Breadcrumbs } from "@/components/customer/breadcrumbs";
import { JsonLd } from "@/components/shared/json-ld";
import { listPublicMeals } from "@/services/catalog.service";
import { breadcrumbLd, itemListLd, pageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata = pageMetadata({ title: "Everyday Meals", description: "Order everyday DOVEEYS KITCHEN meals online. Freshly prepared favourites with secure payment and order tracking.", path: "/menu/normal" });

export default async function Page() {
  let meals: Awaited<ReturnType<typeof listPublicMeals>> = [];
  try { meals = await listPublicMeals({ type: "NORMAL" }); } catch { /* empty state */ }
  return (
    <LayoutShell>
      <JsonLd data={[breadcrumbLd([{ name: "Home", path: "/" }, { name: "Menu", path: "/menu" }, { name: "Normal meals", path: "/menu/normal" }]), itemListLd(meals, "Normal meals", "/menu/normal")]} />
      <section className="page-wrap">
        <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Menu", href: "/menu" }, { name: "Normal meals" }]} />
        <p className="eyebrow">NORMAL MEALS</p>
        <h1>Everyday <em>favourites.</em></h1>
        <Link href="/menu" className="text-link">All menu</Link>
        <div className="listing-grid" style={{ marginTop: 35 }}>{meals.map((m) => <MealCard key={m.id} meal={m} />)}</div>
        {!meals.length && <p className="muted">No meals currently listed here.</p>}
      </section>
    </LayoutShell>
  );
}
