import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LayoutShell, Money } from "@/components/customer/store";
import { Breadcrumbs } from "@/components/customer/breadcrumbs";
import { MealPurchase } from "@/components/customer/meal-purchase";
import { JsonLd } from "@/components/shared/json-ld";
import { getPublicMeal } from "@/services/catalog.service";
import { breadcrumbLd, getSiteInfo, litreLabel, lowestPrice, pageMetadata, productLd, truncate } from "@/lib/seo";
import { ogImage, optimizedUrl } from "@/lib/image-url";
import { formatMoney } from "@/utils/money";

export const revalidate = 60;
type Props = { params: Promise<{ slug: string }> };

async function load(slug: string) { try { return await getPublicMeal(slug); } catch { return null; } }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const meal = await load(slug);
  if (!meal) return { title: "Meal not found", robots: { index: false, follow: false } };
  const info = await getSiteInfo();
  const low = lowestPrice(meal);
  const price = low ? (meal.type === "SPECIAL" ? ` From ${formatMoney(low, info.currency)}.` : ` ${formatMoney(low, info.currency)}.`) : "";
  return pageMetadata({
    title: meal.name,
    description: `${truncate(meal.description, 100)}${price} Order ${meal.name} online from ${info.name}.`,
    path: `/menu/${meal.slug}`, image: ogImage(meal.image),
    keywords: [meal.name, ...(meal.category ? [meal.category.name] : []), "order online", info.name],
  });
}

export default async function MealPage({ params }: Props) {
  const { slug } = await params;
  const [meal, info] = await Promise.all([load(slug), getSiteInfo()]);
  if (!meal) notFound();
  const crumbs = [{ name: "Home", href: "/" }, { name: "Menu", href: "/menu" }, ...(meal.category ? [{ name: meal.category.name, href: `/menu/category/${meal.category.slug}` }] : []), { name: meal.name }];

  return (
    <LayoutShell>
      <JsonLd data={[productLd(meal, info), breadcrumbLd(crumbs.map((c) => ({ name: c.name, path: c.href ?? `/menu/${meal.slug}` })))]} />
      <article className="page-wrap">
        <Breadcrumbs items={crumbs} />
        <div className="order-layout">
          <div className="meal-photo" style={{ aspectRatio: "4/5" }}>
            {meal.image
              ? <img src={optimizedUrl(meal.image, 1000)!} alt={`${meal.name}${meal.category ? `, ${meal.category.name}` : ""} from ${info.name}`} width={1000} height={1250} fetchPriority="high" decoding="async" />
              : <div className="food-placeholder">{info.name}</div>}
          </div>
          <div>
            <p className="eyebrow">{meal.type === "SPECIAL" ? "SPECIAL MEAL" : "FROM OUR MENU"}</p>
            <h1>{meal.name}</h1>
            <p className="muted" style={{ lineHeight: 1.8 }}>{meal.description}</p>
            {meal.ingredients && <p><strong>Ingredients: </strong>{meal.ingredients}</p>}
            {meal.type === "SPECIAL" && meal.options.length > 0 && <p className="muted" style={{ fontSize: 13 }}>Available in {meal.options.map((o) => litreLabel(o.litres)).join(", ")}.</p>}
            <MealPurchase meal={meal} />
            <p className="muted" style={{ fontSize: 12, marginTop: 24 }}>Secure online payment. After paying you receive an email with a link to track your order.</p>
          </div>
        </div>
      </article>
    </LayoutShell>
  );
}
