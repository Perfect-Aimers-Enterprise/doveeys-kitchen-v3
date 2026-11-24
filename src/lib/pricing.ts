import Decimal from "decimal.js";
import { money, sum, lineTotal as mul } from "@/utils/money";

export type MealForPricing = {
  id: string; name: string; description: string; type: "NORMAL" | "SPECIAL"; basePrice: Decimal.Value | null;
  options: { id: string; litres: Decimal.Value; price: Decimal.Value }[];
};
export type RequestedLine = { mealId: string; optionId?: string | null; quantity: number };
export type PricedLine = {
  mealId: string; optionId: string | null; mealName: string; mealDescription: string; mealType: "NORMAL" | "SPECIAL";
  litres: Decimal | null; unitPrice: Decimal; quantity: number; lineTotal: Decimal;
};

export class PricingError extends Error {
  constructor(public code: string, message: string) { super(message); }
}

/** Collapse repeated meal+option lines into one. */
export function mergeLines(lines: RequestedLine[]): RequestedLine[] {
  const map = new Map<string, RequestedLine>();
  for (const l of lines) {
    const key = `${l.mealId}:${l.optionId ?? ""}`;
    const prev = map.get(key);
    map.set(key, prev ? { ...prev, quantity: prev.quantity + l.quantity } : { ...l, optionId: l.optionId ?? null });
  }
  return [...map.values()];
}

/** Price one line entirely from database values. Nothing here comes from the browser except ids and quantity. */
export function priceLine(meal: MealForPricing, line: RequestedLine): PricedLine {
  if (meal.type === "NORMAL") {
    if (line.optionId) throw new PricingError("INVALID_OPTION", `${meal.name} does not have litre options.`);
    if (meal.basePrice == null) throw new PricingError("PRICE_MISSING", `${meal.name} has no price set.`);
    const unit = money(meal.basePrice);
    return { mealId: meal.id, optionId: null, mealName: meal.name, mealDescription: meal.description, mealType: "NORMAL", litres: null, unitPrice: unit, quantity: line.quantity, lineTotal: mul(unit, line.quantity) };
  }
  const option = meal.options.find((o) => o.id === line.optionId);
  if (!line.optionId || !option) throw new PricingError("OPTION_REQUIRED", `Choose a litre size for ${meal.name}.`);
  const unit = money(option.price);
  return { mealId: meal.id, optionId: option.id, mealName: meal.name, mealDescription: meal.description, mealType: "SPECIAL", litres: money(option.litres), unitPrice: unit, quantity: line.quantity, lineTotal: mul(unit, line.quantity) };
}

export function resolveDeliveryFee(p: { zoneFee: Decimal.Value | null; defaultFee: Decimal.Value; freeThreshold: Decimal.Value | null; subtotal: Decimal.Value }) {
  if (p.freeThreshold != null && money(p.subtotal).gte(p.freeThreshold)) return new Decimal(0);
  return money(p.zoneFee ?? p.defaultFee);
}

export const orderTotals = (lines: PricedLine[], deliveryFee: Decimal.Value) => {
  const subtotal = sum(lines.map((l) => l.lineTotal));
  return { subtotal, deliveryFee: money(deliveryFee), total: subtotal.plus(deliveryFee) };
};
