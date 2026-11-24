import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { AppError } from "@/lib/api";
import { randomToken, sha256 } from "@/lib/security/tokens";

export const SESSION_COOKIE = "dk_session";
const SESSION_MS = 7 * 24 * 60 * 60 * 1000;

export async function createSession(adminId: string, meta: { ip?: string; userAgent?: string | null }) {
  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + SESSION_MS);
  await db.session.create({ data: { adminId, tokenHash: sha256(token), expiresAt, ip: meta.ip, userAgent: meta.userAgent?.slice(0, 300) } });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", expires: expiresAt,
  });
}

export async function destroySession() {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (token) await db.session.deleteMany({ where: { tokenHash: sha256(token) } });
  jar.delete(SESSION_COOKIE);
}

export type CurrentAdmin = { id: string; email: string; name: string; role: "OWNER" | "ADMIN" };

/** Server-side source of truth for "who is logged in". Never trust the cookie's presence alone. */
export async function getCurrentAdmin(): Promise<CurrentAdmin | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await db.session.findUnique({ where: { tokenHash: sha256(token) }, include: { admin: true } });
  if (!session) return null;
  if (session.expiresAt <= new Date()) {
    await db.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  const { id, email, name, role } = session.admin;
  return { id, email, name, role };
}

/** For route handlers: throws 401. */
export async function requireAdmin() {
  const admin = await getCurrentAdmin();
  if (!admin) throw new AppError("UNAUTHENTICATED", "Sign in to continue.", 401);
  return admin;
}

/** For server components: redirects to login and returns to the same page afterwards. */
export async function requireAdminPage(returnTo: string) {
  const admin = await getCurrentAdmin();
  if (!admin) redirect(`/admin/login?next=${encodeURIComponent(returnTo)}`);
  return admin;
}
