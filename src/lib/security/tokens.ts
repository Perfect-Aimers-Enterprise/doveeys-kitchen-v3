import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const randomToken = (bytes = 32) => randomBytes(bytes).toString("base64url");
export const sha256 = (value: string) => createHash("sha256").update(value).digest("hex");

export function safeEqual(a: string, b: string) {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

// Unambiguous characters only; used for human-readable order references.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export function orderReference() {
  const bytes = randomBytes(8);
  let out = "";
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return `DK-${out.slice(0, 4)}-${out.slice(4)}`;
}

// Paystack references allow only letters, digits, "-", "." and "=".
export const paystackReference = () => `DKP-${randomBytes(12).toString("hex")}`;
