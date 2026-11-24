import { createHmac, timingSafeEqual } from "node:crypto";

/** HMAC SHA-512 of the RAW request body, compared in constant time. */
export function verifyPaystackSignature(rawBody: string, signature: string | null, secret: string) {
  if (!signature || !secret) return false;
  const expected = createHmac("sha512", secret).update(rawBody).digest("hex");
  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(signature.trim().toLowerCase(), "utf8");
  return a.length === b.length && timingSafeEqual(a, b);
}
