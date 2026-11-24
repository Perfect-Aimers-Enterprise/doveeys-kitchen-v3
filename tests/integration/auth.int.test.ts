import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetDb, testDb } from "./helpers";

vi.mock("@/lib/db", async () => ({ db: (await import("./helpers")).testDb }));
const sent: { to: unknown; subject: string; text: string }[] = [];
vi.mock("nodemailer", () => ({ default: { createTransport: () => ({ sendMail: async (m: any) => { sent.push(m); } }) } }));

const { registerAdmin, authenticate, requestPasswordReset, resetPassword } = await import("@/services/auth.service");
const { consumeRateLimit } = await import("@/lib/security/rate-limit");
const { sha256 } = await import("@/lib/security/tokens");

const reg = (n: number, key = "setup-key-for-tests") => registerAdmin({ name: `Admin ${n}`, email: `admin${n}@test.co`, password: "Strong-Passw0rd!", setupKey: key });

beforeEach(async () => { await resetDb(); sent.length = 0; });

describe("administrator registration limit (real PostgreSQL)", () => {
  it("allows exactly two accounts even when many requests arrive at the same time", async () => {
    const results = await Promise.allSettled([1, 2, 3, 4, 5, 6].map((n) => reg(n)));
    expect(results.filter((r) => r.status === "fulfilled")).toHaveLength(2);
    const rejected = results.filter((r): r is PromiseRejectedResult => r.status === "rejected");
    expect(rejected).toHaveLength(4);
    expect(rejected.every((r) => r.reason.code === "REGISTRATION_CLOSED")).toBe(true);
    expect(await testDb.admin.count()).toBe(2);
    const roles = (await testDb.admin.findMany()).map((a) => a.role).sort();
    expect(roles).toEqual(["ADMIN", "OWNER"]);
  });
  it("stays closed afterwards and rejects a wrong setup key", async () => {
    await reg(1); await reg(2);
    await expect(reg(3)).rejects.toMatchObject({ code: "REGISTRATION_CLOSED" });
    await expect(reg(9, "wrong")).rejects.toMatchObject({ code: "INVALID_SETUP_KEY" });
  });
  it("rejects a duplicate email and stores only a password hash", async () => {
    await reg(1);
    await expect(registerAdmin({ name: "Again", email: "admin1@test.co", password: "Strong-Passw0rd!", setupKey: "setup-key-for-tests" })).rejects.toMatchObject({ code: "EMAIL_TAKEN" });
    const a = await testDb.admin.findFirstOrThrow();
    expect(a.passwordHash).toMatch(/^\$argon2id\$/);
    expect(a.passwordHash).not.toContain("Strong-Passw0rd");
  });
});

describe("login protection", () => {
  it("signs in with correct credentials and gives the same error for unknown email and wrong password", async () => {
    await reg(1);
    await expect(authenticate("admin1@test.co", "Strong-Passw0rd!")).resolves.toMatchObject({ email: "admin1@test.co", role: "OWNER" });
    const a = await authenticate("nobody@test.co", "x").catch((e) => e);
    const b = await authenticate("admin1@test.co", "wrong").catch((e) => e);
    expect(a.code).toBe("INVALID_CREDENTIALS"); expect(b.code).toBe("INVALID_CREDENTIALS"); expect(a.message).toBe(b.message);
  });
  it("locks the account after five failures, even for the right password", async () => {
    await reg(1);
    for (let i = 0; i < 5; i++) await authenticate("admin1@test.co", "bad").catch(() => {});
    await expect(authenticate("admin1@test.co", "Strong-Passw0rd!")).rejects.toMatchObject({ code: "ACCOUNT_LOCKED" });
  });
});

describe("rate limiter (raw SQL upsert)", () => {
  it("allows the limit then blocks, and counts concurrent hits exactly", async () => {
    const hits = await Promise.all(Array.from({ length: 8 }, () => consumeRateLimit("t:concurrent", 5, 60_000)));
    expect(hits.filter((h) => h.allowed)).toHaveLength(5);
    expect(hits.filter((h) => !h.allowed)).toHaveLength(3);
    expect((await consumeRateLimit("t:other", 1, 60_000)).allowed).toBe(true);
    expect((await consumeRateLimit("t:other", 1, 60_000)).allowed).toBe(false);
  });
  it("starts a fresh window after expiry", async () => {
    await consumeRateLimit("t:expire", 1, 60_000);
    await testDb.$executeRawUnsafe(`UPDATE "RateLimit" SET "resetAt" = NOW() - interval '1 second' WHERE "key" = 't:expire'`);
    expect((await consumeRateLimit("t:expire", 1, 60_000)).allowed).toBe(true);
  });
});

describe("password reset", () => {
  it("emails a one-time link, resets the password, signs out sessions, and cannot be reused", async () => {
    const a = await reg(1);
    await testDb.session.create({ data: { adminId: a.id, tokenHash: "x", expiresAt: new Date(Date.now() + 1e6) } });
    await requestPasswordReset("admin1@test.co");
    expect(sent).toHaveLength(1);
    const token = sent[0].text.match(/token=([\w-]+)/)![1];
    const row = await testDb.passwordResetToken.findFirstOrThrow();
    expect(row.tokenHash).toBe(sha256(token)); expect(row.tokenHash).not.toBe(token);
    await resetPassword(token, "Another-Passw0rd!");
    await expect(authenticate("admin1@test.co", "Another-Passw0rd!")).resolves.toBeTruthy();
    await expect(authenticate("admin1@test.co", "Strong-Passw0rd!")).rejects.toMatchObject({ code: "INVALID_CREDENTIALS" });
    expect(await testDb.session.count()).toBe(0);
    await expect(resetPassword(token, "Third-Passw0rd!!")).rejects.toMatchObject({ code: "INVALID_RESET_TOKEN" });
    expect((await testDb.emailLog.findFirstOrThrow()).bodyHtml).toBeNull(); // reset emails are never stored
  });
  it("answers identically for unknown emails and sends nothing", async () => {
    await expect(requestPasswordReset("ghost@test.co")).resolves.toBeUndefined();
    expect(sent).toHaveLength(0);
  });
});
