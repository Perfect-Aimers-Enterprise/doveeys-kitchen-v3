import type { Metadata } from "next";
import Link from "next/link";
import { LayoutShell, MealCard } from "@/components/customer/store";
import { JsonLd } from "@/components/shared/json-ld";
import { listPublicMeals } from "@/services/catalog.service";
import { developerLd, getSiteInfo, pageMetadata, restaurantLd, websiteLd } from "@/lib/seo";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const i = await getSiteInfo();
  return { ...pageMetadata({ title: `${i.name} | Thoughtfully prepared meals, ordered online`, description: i.description, path: "/" }), title: { absolute: `${i.name} | Thoughtfully prepared meals, ordered online` } };
}

export default async function Home() {
  const info = await getSiteInfo();
  let meals: Awaited<ReturnType<typeof listPublicMeals>> = [];
  try { meals = await listPublicMeals({ featured: true }); } catch { /* render the page without featured meals */ }
  return (
    <LayoutShell>
      <JsonLd data={[restaurantLd(info), websiteLd(info), developerLd()]} />
      <section className="hero">
        <div className="hero-copy">
          <p className="eyebrow">THE DOVEEYS EXPERIENCE</p>
          <h1>Good food.<br /><em>Beautifully made.</em></h1>
          <p>{info.slogan || "Discover thoughtfully prepared dishes made to bring a little more warmth and joy to your table."}</p>
          <Link className="button" href="/menu">Explore our menu <span>↗</span></Link>
          <div className="hero-note">PREPARED WITH CARE · SERVED WITH LOVE</div>
        </div>
        <div className="hero-image">
          <img src="https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1400&q=85" alt="A beautifully plated meal from DOVEEYS KITCHEN" width={1400} height={1050} fetchPriority="high" decoding="async" />
        </div>
      </section>
      <section className="intro">
        <p className="eyebrow">A TABLE WORTH GATHERING AROUND</p>
        <h2>Every meal is an invitation<br />to <em>slow down and savour.</em></h2>
        <p>Explore a menu of favourites and special dishes, prepared for everyday moments and memorable occasions.</p>
        <Link href="/about" className="text-link">Discover our story ↗</Link>
      </section>
      <section className="section meals-section" aria-labelledby="featured-heading">
        <div className="section-head">
          <div><p className="eyebrow">FROM OUR KITCHEN</p><h2 id="featured-heading">Featured <em>delights</em></h2></div>
          <Link className="text-link" href="/menu">View all meals ↗</Link>
        </div>
        <div className="meal-grid">{meals.slice(0, 4).map((m) => <MealCard key={m.id} meal={m} />)}</div>
        {!meals.length && <p className="muted">Our menu is being prepared. Please check back soon.</p>}
        <div className="center"><Link className="button button-outline" href="/menu">Discover the menu ↗</Link></div>
      </section>
      <section className="special-banner">
        <div>
          <p className="eyebrow">MADE FOR SHARING</p>
          <h2>Special dishes,<br /><em>your way.</em></h2>
          <p>Choose the size that suits your gathering with our special meals available in selected litre options.</p>
          <Link className="button" href="/menu/special">Explore special meals ↗</Link>
        </div>
        <img src="https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=1200&q=85" alt="Food prepared for sharing, available by the litre" width={1200} height={900} loading="lazy" decoding="async" />
      </section>
      <section className="final-cta">
        <p className="eyebrow">LET&apos;S MAKE YOUR NEXT MEAL MEMORABLE</p>
        <h2>Something delicious<br /><em>is waiting.</em></h2>
        <Link className="button" href="/menu">Order from our menu ↗</Link>
      </section>
    </LayoutShell>
  );
}
