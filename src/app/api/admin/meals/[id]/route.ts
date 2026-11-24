import { z } from "zod";
import { AppError, ok } from "@/lib/api";
import { adminRoute } from "@/lib/admin-route";
import { mealSchema } from "@/lib/validation/meal";
import { readJson } from "@/lib/security/request";
import { getAdminMeal, patchMeal, setMealArchived, updateMeal } from "@/services/meal-admin.service";

export const runtime = "nodejs";
type P = { id: string };

export const GET = adminRoute<P>(async ({ params }) => {
  const meal = await getAdminMeal(params.id);
  if (!meal) throw new AppError("MEAL_NOT_FOUND", "Meal not found.", 404);
  return ok({ meal });
});

export const PUT = adminRoute<P>(async ({ req, admin, params }) => {
  await updateMeal(params.id, mealSchema.parse(await readJson(req)), admin.id);
  return ok({ updated: true });
});

const patchSchema = z.object({ isAvailable: z.boolean().optional(), isFeatured: z.boolean().optional(), archived: z.boolean().optional() }).strict().refine((v) => Object.keys(v).length > 0, "Nothing to update");

export const PATCH = adminRoute<P>(async ({ req, admin, params }) => {
  const { archived, ...rest } = patchSchema.parse(await readJson(req));
  if (archived !== undefined) await setMealArchived(params.id, archived, admin.id);
  if (Object.keys(rest).length) await patchMeal(params.id, rest, admin.id);
  return ok({ updated: true });
});

export const DELETE = adminRoute<P>(async ({ admin, params }) => {
  await setMealArchived(params.id, true, admin.id); // archive, never hard-delete: past orders keep their snapshots
  return ok({ archived: true });
});
