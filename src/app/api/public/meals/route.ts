import { fail, ok } from "@/lib/api";
import { listPublicMeals } from "@/services/catalog.service";

export const runtime = "nodejs";

export async function GET(req: Request) {
  try {
    const p = new URL(req.url).searchParams;
    const type = p.get("type");
    const meals = await listPublicMeals({
      category: p.get("category") ?? undefined,
      featured: p.get("featured") === "true",
      q: p.get("q")?.trim().slice(0, 80) || undefined,
      type: type === "NORMAL" || type === "SPECIAL" ? type : undefined,
    });
    return ok({ meals });
  } catch (e) { return fail(e); }
}
