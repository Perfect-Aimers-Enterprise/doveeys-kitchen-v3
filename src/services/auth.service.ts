import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { AppError } from "@/lib/api";
import { siteConfig } from "@/config";
import { burnPasswordCheck, hashPassword, verifyPassword } from "@/lib/auth/password";
import { randomToken, safeEqual, sha256 } from "@/lib/security/tokens";
import { passwordResetEmail } from "@/lib/email/templates";
import { sendEmail } from "./email.service";

export const MAX_ADMINS = 2;
const MAX_FAILED_LOGINS = 5;
const LOCK_MS = 15 * 60 * 1000;
const RESET_MS = 60 * 60 * 1000;

export async function registrationOpen() {
  return (await db.admin.count()) < MAX_ADMINS;
}

function checkSetupKey(provided: string) {
  const expected = process.env.ADMIN_SETUP_KEY;
  if (!expected) throw new AppError("REGISTRATION_UNAVAILABLE", "Registration is not configured.", 503);
  // Hash both sides so comparison length never leaks the key length.
  if (!safeEqual(sha256(provided), sha256(expected))) throw new AppError("INVALID_SETUP_KEY", "The setup key is not correct.", 403);
}

export async function registerAdmin(input: { name: string; email: string; password: string; setupKey: string }) {
  checkSetupKey(input.setupKey);
  const passwordHash = await hashPassword(input.password);
  try {
    return await db.$transaction(async (tx) => {
      // The table lock serialises concurrent registrations, so the count below cannot be raced past the limit.
      await tx.$executeRaw`LOCK TABLE "Admin" IN EXCLUSIVE MODE`;
      const count = await tx.admin.count();
      if (count >= MAX_ADMINS) throw new AppError("REGISTRATION_CLOSED", "Registration is closed.", 403);
      const admin = await tx.admin.create({
        data: { name: input.name, email: input.email, passwordHash, role: count === 0 ? "OWNER" : "ADMIN" },
        select: { id: true, email: true, name: true, role: true },
      });
      await tx.adminAuditLog.create({ data: { adminId: admin.id, action: "admin.register", entity: "Admin", entityId: admin.id } });
      return admin;
    });
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") throw new AppError("EMAIL_TAKEN", "An account with this email already exists.", 409);
    throw e;
  }
}

const BAD_LOGIN = () => new AppError("INVALID_CREDENTIALS", "Incorrect email or password.", 401);

export async function authenticate(email: string, password: string) {
  const admin = await db.admin.findUnique({ where: { email } });
  if (!admin) { await burnPasswordCheck(password); throw BAD_LOGIN(); }
  if (admin.lockedUntil && admin.lockedUntil > new Date()) {
    throw new AppError("ACCOUNT_LOCKED", "Too many failed attempts. Try again in 15 minutes or reset your password.", 429);
  }
  if (!(await verifyPassword(admin.passwordHash, password))) {
    const failed = admin.failedLogins + 1;
    await db.admin.update({
      where: { id: admin.id },
      data: failed >= MAX_FAILED_LOGINS ? { failedLogins: 0, lockedUntil: new Date(Date.now() + LOCK_MS) } : { failedLogins: failed },
    });
    throw BAD_LOGIN();
  }
  await db.admin.update({ where: { id: admin.id }, data: { failedLogins: 0, lockedUntil: null } });
  await db.adminAuditLog.create({ data: { adminId: admin.id, action: "admin.login", entity: "Admin", entityId: admin.id } });
  return { id: admin.id, email: admin.email, name: admin.name, role: admin.role };
}

/** Always resolves the same way so callers cannot learn which emails are registered. */
export async function requestPasswordReset(email: string) {
  const admin = await db.admin.findUnique({ where: { email } });
  if (!admin) return;
  const token = randomToken(32);
  await db.passwordResetToken.create({ data: { adminId: admin.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + RESET_MS) } });
  const link = `${siteConfig.appUrl}/admin/reset-password?token=${token}`;
  const mail = passwordResetEmail(link);
  await sendEmail({ to: admin.email, template: "admin-password-reset", ...mail, storeBody: false });
}

export async function resetPassword(token: string, password: string) {
  const row = await db.passwordResetToken.findUnique({ where: { tokenHash: sha256(token) } });
  if (!row || row.usedAt || row.expiresAt <= new Date()) throw new AppError("INVALID_RESET_TOKEN", "This reset link is invalid or has expired. Request a new one.", 400);
  const passwordHash = await hashPassword(password);
  await db.$transaction([
    db.admin.update({ where: { id: row.adminId }, data: { passwordHash, failedLogins: 0, lockedUntil: null } }),
    db.passwordResetToken.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
    db.session.deleteMany({ where: { adminId: row.adminId } }), // sign out everywhere
    db.adminAuditLog.create({ data: { adminId: row.adminId, action: "admin.password_reset", entity: "Admin", entityId: row.adminId } }),
  ]);
}
