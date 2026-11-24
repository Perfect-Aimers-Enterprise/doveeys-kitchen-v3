import { fail } from "@/lib/api";
import { requireAdmin, type CurrentAdmin } from "@/lib/auth/session";
import { assertSameOrigin } from "@/lib/security/request";

/**
 * Wraps an administrator route handler: verifies the session server-side, blocks cross-origin writes and
 * converts every error into the standard envelope. Every /api/admin route (except auth) must use this.
 */
export function adminRoute<P = Record<string, never>>(fn: (c: { req: Request; admin: CurrentAdmin; params: P }) => Promise<Response>) {
  return async (req: Request, ctx: { params: Promise<P> }) => {
    try {
      if (!["GET", "HEAD"].includes(req.method)) assertSameOrigin(req);
      const admin = await requireAdmin();
      return await fn({ req, admin, params: await ctx.params });
    } catch (e) { return fail(e); }
  };
}

export const idParam = { id: "" };
