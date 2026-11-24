import { fail, ok } from "@/lib/api";
import { destroySession } from "@/lib/auth/session";
import { assertSameOrigin } from "@/lib/security/request";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try { assertSameOrigin(req); await destroySession(); return ok({ loggedOut: true }); } catch (e) { return fail(e); }
}
