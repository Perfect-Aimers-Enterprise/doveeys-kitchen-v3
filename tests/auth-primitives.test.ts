import { describe, expect, it } from "vitest";
import { safeNext } from "../src/lib/security/redirect";
import { hashPassword, verifyPassword } from "../src/lib/auth/password";
import { registerSchema, resetSchema } from "../src/lib/validation/auth";
import { layout, esc, passwordResetEmail } from "../src/lib/email/templates";

describe("safeNext (open-redirect protection)", () => {
  it("keeps genuine admin deep links", () => {
    expect(safeNext("/admin/orders/abc123")).toBe("/admin/orders/abc123");
    expect(safeNext("/admin/orders?status=PAID")).toBe("/admin/orders?status=PAID");
  });
  it.each(["https://evil.com", "//evil.com", "/admin/../x", "/\\evil.com", "/orders/1", "", null, undefined, "/admin/login", "/admin/reset-password?token=x", "/admin/x\r\nSet-Cookie: a=b"])(
    "rejects %s", (v) => {
      const r = safeNext(v as string | null | undefined);
      expect(r).toBe("/admin/dashboard");
    });
});

describe("passwords", () => {
  it("hashes with argon2id and verifies", async () => {
    const hash = await hashPassword("Correct-Horse-9");
    expect(hash.startsWith("$argon2id$")).toBe(true);
    expect(await verifyPassword(hash, "Correct-Horse-9")).toBe(true);
    expect(await verifyPassword(hash, "wrong")).toBe(false);
    expect(await verifyPassword("not-a-hash", "x")).toBe(false);
  });
  it("enforces the password policy and rejects unknown fields (mass assignment)", () => {
    const base = { name: "Ada", email: "A@Example.com", setupKey: "k" };
    expect(registerSchema.safeParse({ ...base, password: "short1A" }).success).toBe(false);
    expect(registerSchema.safeParse({ ...base, password: "alllowercase123" }).success).toBe(false);
    const good = registerSchema.safeParse({ ...base, password: "Strong-Passw0rd!" });
    expect(good.success && good.data.email).toBe("a@example.com");
    expect(registerSchema.safeParse({ ...base, password: "Strong-Passw0rd!", role: "OWNER" }).success).toBe(false);
    expect(resetSchema.safeParse({ token: "x", password: "Strong-Passw0rd!" }).success).toBe(false);
  });
});

describe("email templates", () => {
  it("escapes HTML in interpolated values", () => {
    expect(esc(`<script>"x"&'`)).toBe("&lt;script&gt;&quot;x&quot;&amp;&#39;");
    expect(layout("<b>", "")).not.toContain("<b>");
  });
  it("includes link in both html and text parts", () => {
    const m = passwordResetEmail("https://x.test/admin/reset-password?token=abc");
    expect(m.html).toContain("token=abc");
    expect(m.text).toContain("token=abc");
  });
});
