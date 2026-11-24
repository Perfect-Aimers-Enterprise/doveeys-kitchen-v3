import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { mergeLines, priceLine, resolveDeliveryFee, orderTotals, PricingError, type MealForPricing } from "../src/lib/pricing";
import { assertAdminTransition, canTransition } from "../src/lib/order-status";
import { verifyPaystackSignature } from "../src/lib/paystack/signature";
import { createOrderSchema } from "../src/lib/validation/order";
import { toMoneyString } from "../src/utils/money";

const normal: MealForPricing = { id: "m1", name: "Jollof", description: "d", type: "NORMAL", basePrice: "5000.50", options: [] };
const special: MealForPricing = { id: "m2", name: "Soup", description: "d", type: "SPECIAL", basePrice: null,
  options: [{ id: "o1", litres: "1", price: "12000" }, { id: "o2", litres: "2", price: "23000" }] };

describe("pricing", () => {
  it("prices normal meals from the database price only", () => {
    const l = priceLine(normal, { mealId: "m1", quantity: 3 });
    expect(toMoneyString(l.lineTotal)).toBe("15001.50");
  });
  it("prices special meals by chosen litre option", () => {
    const l = priceLine(special, { mealId: "m2", optionId: "o2", quantity: 2 });
    expect(toMoneyString(l.unitPrice)).toBe("23000.00");
    expect(toMoneyString(l.lineTotal)).toBe("46000.00");
    expect(l.litres?.toString()).toBe("2");
  });
  it("rejects missing, foreign or unexpected options", () => {
    expect(() => priceLine(special, { mealId: "m2", quantity: 1 })).toThrow(PricingError);
    expect(() => priceLine(special, { mealId: "m2", optionId: "other-meals-option", quantity: 1 })).toThrow(PricingError);
    expect(() => priceLine(normal, { mealId: "m1", optionId: "o1", quantity: 1 })).toThrow(PricingError);
  });
  it("merges duplicate lines", () => {
    expect(mergeLines([{ mealId: "a", quantity: 1 }, { mealId: "a", quantity: 2 }, { mealId: "a", optionId: "x", quantity: 1 }])).toHaveLength(2);
  });
  it("totals with decimals exactly", () => {
    const lines = [priceLine(normal, { mealId: "m1", quantity: 1 }), priceLine(special, { mealId: "m2", optionId: "o1", quantity: 1 })];
    const t = orderTotals(lines, "1500.25");
    expect(toMoneyString(t.subtotal)).toBe("17000.50");
    expect(toMoneyString(t.total)).toBe("18500.75");
  });
});

describe("delivery fee", () => {
  const base = { defaultFee: "1500", zoneFee: null, freeThreshold: null, subtotal: "10000" };
  it("uses default, zone fee and free threshold in that precedence", () => {
    expect(toMoneyString(resolveDeliveryFee(base))).toBe("1500.00");
    expect(toMoneyString(resolveDeliveryFee({ ...base, zoneFee: "2500" }))).toBe("2500.00");
    expect(toMoneyString(resolveDeliveryFee({ ...base, zoneFee: "2500", freeThreshold: "10000" }))).toBe("0.00");
    expect(toMoneyString(resolveDeliveryFee({ ...base, freeThreshold: "10000.01" }))).toBe("1500.00");
  });
});

describe("order status rules", () => {
  it("never lets an unpaid order be processed or delivered", () => {
    expect(assertAdminTransition("PAID", "CONFIRMED", "PENDING").ok).toBe(false);
    expect(assertAdminTransition("PENDING_PAYMENT", "DELIVERED", "SUCCESSFUL").ok).toBe(false);
    expect(canTransition("PENDING_PAYMENT", "PAID")).toBe(false);
  });
  it("allows the normal path and blocks skipping or reopening", () => {
    expect(assertAdminTransition("PAID", "CONFIRMED", "SUCCESSFUL").ok).toBe(true);
    expect(assertAdminTransition("PAID", "DELIVERED", "SUCCESSFUL").ok).toBe(false);
    expect(assertAdminTransition("DELIVERED", "CANCELLED", "SUCCESSFUL").ok).toBe(false);
    expect(assertAdminTransition("CANCELLED", "PAID", "SUCCESSFUL").ok).toBe(false);
    expect(assertAdminTransition("OUT_FOR_DELIVERY", "CANCELLED", "SUCCESSFUL").ok).toBe(false);
  });
});

describe("paystack webhook signature", () => {
  const secret = "sk_test_abc"; const body = JSON.stringify({ event: "charge.success", data: { reference: "r" } });
  const sig = createHmac("sha512", secret).update(body).digest("hex");
  it("accepts a valid signature over the raw body", () => expect(verifyPaystackSignature(body, sig, secret)).toBe(true));
  it("rejects tampered body, wrong secret, missing or short signature", () => {
    expect(verifyPaystackSignature(body + " ", sig, secret)).toBe(false);
    expect(verifyPaystackSignature(body, sig, "other")).toBe(false);
    expect(verifyPaystackSignature(body, null, secret)).toBe(false);
    expect(verifyPaystackSignature(body, sig.slice(0, 10), secret)).toBe(false);
  });
});

describe("create-order payload", () => {
  const ok = { items: [{ mealId: "m1", quantity: 2 }], customer: { name: "Ada Obi", email: "a@b.co", phone: "+234 801 234 5678" }, delivery: { address: "12 Example Street" } };
  it("accepts a valid order", () => expect(createOrderSchema.safeParse(ok).success).toBe(true));
  it("rejects client-supplied prices, totals and payment status (mass assignment)", () => {
    expect(createOrderSchema.safeParse({ ...ok, total: "1" }).success).toBe(false);
    expect(createOrderSchema.safeParse({ ...ok, paymentStatus: "SUCCESSFUL" }).success).toBe(false);
    expect(createOrderSchema.safeParse({ ...ok, items: [{ mealId: "m1", quantity: 1, price: "1" }] }).success).toBe(false);
    expect(createOrderSchema.safeParse({ ...ok, delivery: { address: "12 Example Street", fee: "0" } }).success).toBe(false);
  });
  it("rejects empty carts and bad quantities", () => {
    expect(createOrderSchema.safeParse({ ...ok, items: [] }).success).toBe(false);
    expect(createOrderSchema.safeParse({ ...ok, items: [{ mealId: "m1", quantity: 0 }] }).success).toBe(false);
    expect(createOrderSchema.safeParse({ ...ok, items: [{ mealId: "m1", quantity: 1.5 }] }).success).toBe(false);
  });
});
