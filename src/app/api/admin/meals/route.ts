import { ok } from "@/lib/api";
import { adminRoute } from "@/lib/admin-route";
import { mealSchema } from "@/lib/validation/meal";
import { readJson } from "@/lib/security/request";
import { createMeal, listAdminMeals } from "@/services/meal-admin.service";

export const runtime = "nodejs";

export const GET = adminRoute(async ({ req }) => {
  const p = new URL(req.url).searchParams;
  const status = p.get("status");
  const type = p.get("type");
  return ok({ meals: await listAdminMeals({ q: p.get("q") ?? undefined, status: status === "archived" || status === "all" ? status : "active", type: type === "NORMAL" || type === "SPECIAL" ? type : undefined, categoryId: p.get("categoryId") ?? undefined }) });
});

export const POST = adminRoute(async ({ req, admin }) => {
  const meal = await createMeal(mealSchema.parse(await readJson(req)), admin.id);
  return ok({ id: meal.id, slug: meal.slug }, 201);
});
