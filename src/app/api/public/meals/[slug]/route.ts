import { AppError, fail, ok } from "@/lib/api";
import { getPublicMeal } from "@/services/catalog.service";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const meal = await getPublicMeal((await params).slug);
    if (!meal) throw new AppError("MEAL_NOT_FOUND", "Meal not found.", 404);
    return ok({ meal });
  } catch (e) { return fail(e); }
}
