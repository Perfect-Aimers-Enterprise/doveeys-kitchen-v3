import Link from "next/link";
import { Empty, PageHeader, btnGhost, btnPrimary, inputCls } from "@/components/admin/ui";
import { MealList, type MealRow } from "@/components/forms/meal-list";
import { listAdminMeals } from "@/services/meal-admin.service";
import { getSetting } from "@/services/settings.service";
import { toMoneyString } from "@/utils/money";

export const metadata = { title: "Meals" };

export default async function MealsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const status = sp.status === "archived" ? "archived" : "active";
  const type = sp.type === "NORMAL" || sp.type === "SPECIAL" ? sp.type : undefined;
  const [meals, currency] = await Promise.all([listAdminMeals({ q: sp.q?.trim() || undefined, status, type }), getSetting("business.currency")]);
  const rows: MealRow[] = meals.map((m) => ({
    id: m.id, name: m.name, slug: m.slug, type: m.type, price: m.basePrice ? toMoneyString(m.basePrice) : null,
    options: m.options.map((o) => ({ litres: o.litres.toString(), price: toMoneyString(o.price) })), image: m.imageUrl, category: m.category?.name ?? null,
    isAvailable: m.isAvailable, isFeatured: m.isFeatured, archived: Boolean(m.archivedAt),
  }));
  const filtered = Boolean(sp.q || type);
  return (
    <>
      <PageHeader title="Meals" subtitle="Manage the menu customers see." actions={<><Link href="/admin/meals/categories" className={btnGhost}>Categories</Link><Link href="/admin/meals/new" className={btnPrimary}>Add meal</Link></>} />
      <form className="mb-4 flex flex-wrap gap-2" role="search">
        <input name="q" defaultValue={sp.q} placeholder="Search meals" aria-label="Search meals" className={`${inputCls} max-w-xs`} />
        <select name="type" defaultValue={type ?? ""} aria-label="Meal type" className={`${inputCls} w-40`}><option value="">All types</option><option value="NORMAL">Normal</option><option value="SPECIAL">Special</option></select>
        <select name="status" defaultValue={status} aria-label="Status" className={`${inputCls} w-40`}><option value="active">Active</option><option value="archived">Archived</option></select>
        <button className={btnGhost}>Filter</button>
      </form>
      {rows.length === 0 ? (
        <Empty title={status === "archived" ? "No archived meals" : filtered ? "No meals match" : "No meals yet"} text={filtered ? "Try a different search or filter." : "Add your first meal to start taking orders."} action={!filtered && status === "active" ? <Link href="/admin/meals/new" className={btnPrimary}>Add meal</Link> : undefined} />
      ) : <MealList meals={rows} currency={currency} canReorder={!filtered && status === "active"} />}
    </>
  );
}
