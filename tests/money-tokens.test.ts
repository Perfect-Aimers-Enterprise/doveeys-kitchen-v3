import { describe, expect, it } from "vitest";
import { lineTotal, sum, toMinorUnits, toMoneyString } from "../src/utils/money";
import { orderReference, randomToken, safeEqual, sha256 } from "../src/lib/security/tokens";

describe("money", () => {
  it("avoids floating point drift", () => {
    expect(toMoneyString(sum(["0.1", "0.2"]))).toBe("0.30");
    expect(toMoneyString(lineTotal("12000.10", 3))).toBe("36000.30");
  });
  it("converts to kobo exactly", () => {
    expect(toMinorUnits("23000.55")).toBe(2300055);
  });
});

describe("tokens", () => {
  it("generates unique high-entropy tokens and stable hashes", () => {
    const a = randomToken(), b = randomToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(43);
    expect(sha256(a)).toBe(sha256(a));
  });
  it("compares in constant time and rejects length mismatch", () => {
    expect(safeEqual("abc", "abc")).toBe(true);
    expect(safeEqual("abc", "abd")).toBe(false);
    expect(safeEqual("abc", "abcd")).toBe(false);
  });
  it("formats order references", () => {
    expect(orderReference()).toMatch(/^DK-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  });
});
