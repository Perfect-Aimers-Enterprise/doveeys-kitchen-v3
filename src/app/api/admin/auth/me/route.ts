import { fail, ok } from "@/lib/api";
import { requireAdmin } from "@/lib/auth/session";

export const runtime = "nodejs";

export async function GET() {
  try { return ok({ admin: await requireAdmin() }); } catch (e) { return fail(e); }
}
