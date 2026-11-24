import { fail, ok } from "@/lib/api";
import { listPublicCategories } from "@/services/catalog.service";

export const runtime = "nodejs";

export async function GET() {
  try { return ok({ categories: await listPublicCategories() }); } catch (e) { return fail(e); }
}
