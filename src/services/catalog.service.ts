import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { toMoneyString } from "@/utils/money";
import { optimizedUrl } from "@/lib/cloudinary";

const include = { category: true, options: { orderBy: { sortOrder: "asc" as const } } };

type MealRow = Prisma.MealGetPayload<{ include: typeof include }>;

/** Public shape. Money is always a string with two decimals; litres is a string. */
export function toPublicMeal(m: MealRow) {
  return {
    id: m.id, slug: m.slug, name: m.name, description: m.description, ingredients: m.ingredients,
    type: m.type, price: m.type === "NORMAL" && m.basePrice ? toMoneyString(m.basePrice) : null,
    options: m.type === "SPECIAL" ? m.options.map((o) => ({ id: o.id, litres: o.litres.toString(), price: toMoneyString(o.price) })) : [],
    image: optimizedUrl(m.imageUrl), isAvailable: m.isAvailable, isFeatured: m.isFeatured,
    category: m.category ? { id: m.category.id, name: m.category.name, slug: m.category.slug } : null,
  };
}

export async function listPublicMeals(f: { category?: string; featured?: boolean; q?: string; type?: "NORMAL" | "SPECIAL" }) {
  const meals = await db.meal.findMany({
    where: {
      archivedAt: null,
      ...(f.featured ? { isFeatured: true } : {}),
      ...(f.type ? { type: f.type } : {}),
      ...(f.category ? { category: { slug: f.category, archivedAt: null } } : {}),
      ...(f.q ? { OR: [{ name: { contains: f.q, mode: "insensitive" } }, { description: { contains: f.q, mode: "insensitive" } }] } : {}),
    },
    include, orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });
  return meals.map(toPublicMeal);
}

export async function getPublicMeal(slug: string) {
  const m = await db.meal.findFirst({ where: { slug, archivedAt: null }, include });
  return m ? toPublicMeal(m) : null;
}

export async function listPublicCategories() {
  const cats = await db.mealCategory.findMany({
    where: { archivedAt: null }, orderBy: { sortOrder: "asc" },
    include: { _count: { select: { meals: { where: { archivedAt: null } } } } },
  });
  return cats.map((c) => ({ id: c.id, name: c.name, slug: c.slug, mealCount: c._count.meals }));
}
