import Link from "next/link";
import { LayoutShell, MealCard } from "@/components/customer/store";
import { Breadcrumbs } from "@/components/customer/breadcrumbs";
import { JsonLd } from "@/components/shared/json-ld";
import { listPublicMeals } from "@/services/catalog.service";
import { breadcrumbLd, itemListLd, pageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";
export const metadata = pageMetadata({ title: "Special Meals by the Litre", description: "Order special DOVEEYS KITCHEN meals by the litre, with a size and price for every gathering. Pay online and track your order.", path: "/menu/special" });

export default async function Page() {
  let meals: Awaited<ReturnType<typeof listPublicMeals>> = [];
  try { meals = await listPublicMeals({ type: "SPECIAL" }); } catch { /* empty state */ }
  return (
    <LayoutShell>
      <JsonLd data={[breadcrumbLd([{ name: "Home", path: "/" }, { name: "Menu", path: "/menu" }, { name: "Special meals", path: "/menu/special" }]), itemListLd(meals, "Special meals", "/menu/special")]} />
      <section className="page-wrap">
        <Breadcrumbs items={[{ name: "Home", href: "/" }, { name: "Menu", href: "/menu" }, { name: "Special meals" }]} />
        <p className="eyebrow">SPECIAL MEALS</p>
        <h1>Special dishes, <em>by the litre.</em></h1>
        <Link href="/menu" className="text-link">All menu</Link>
        <div className="listing-grid" style={{ marginTop: 35 }}>{meals.map((m) => <MealCard key={m.id} meal={m} />)}</div>
        {!meals.length && <p className="muted">No meals currently listed here.</p>}
      </section>
    </LayoutShell>
  );
}
