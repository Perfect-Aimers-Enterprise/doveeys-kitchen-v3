import Decimal from "decimal.js";

// All money maths goes through Decimal. Never use JS floats for amounts.
Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

export type MoneyInput = Decimal.Value;

export const money = (v: MoneyInput) => new Decimal(v);
export const sum = (values: MoneyInput[]) => values.reduce<Decimal>((a, v) => a.plus(v), new Decimal(0));
export const lineTotal = (unit: MoneyInput, qty: number) => new Decimal(unit).times(qty);
export const toMoneyString = (v: MoneyInput) => new Decimal(v).toFixed(2);
// Paystack works in the lowest currency unit (kobo for NGN).
export const toMinorUnits = (v: MoneyInput) => new Decimal(v).times(100).toDecimalPlaces(0).toNumber();
export const fromMinorUnits = (v: number) => new Decimal(v).dividedBy(100);

export function formatMoney(v: MoneyInput, currency = "NGN") {
  return new Intl.NumberFormat("en-NG", { style: "currency", currency }).format(new Decimal(v).toNumber());
}
