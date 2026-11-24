import { Prisma, type OrderStatus, type PaymentStatus } from "@prisma/client";
import Decimal from "decimal.js";
import { db } from "@/lib/db";
import { money, toMoneyString } from "@/utils/money";
import { addLocalDays, localParts } from "@/utils/tz";

export const PAID_PAYMENT: PaymentStatus[] = ["SUCCESSFUL", "REFUNDED"];
export const IN_PROGRESS: OrderStatus[] = ["PAID", "CONFIRMED", "PROCESSING", "READY", "OUT_FOR_DELIVERY"];

const dec = (v: Decimal.Value | null | undefined) => money(v ?? 0);

/** Every figure comes from real rows. "Paid" means a verified payment: SUCCESSFUL, or REFUNDED (money was received, then returned). */
export async function getAnalytics(from: Date, to: Date, tz: string) {
  const paid = { paidAt: { gte: from, lt: to }, paymentStatus: { in: PAID_PAYMENT } } satisfies Prisma.OrderWhereInput;
  const created = { createdAt: { gte: from, lt: to } } satisfies Prisma.OrderWhereInput;

  const [paidAgg, placed, cancelled, delivered, inProgress, refunds, byStatus, best, byType, byLitre, trendRows] = await Promise.all([
    db.order.aggregate({ where: paid, _sum: { total: true }, _count: true }),
    db.order.count({ where: created }),
    db.order.count({ where: { ...created, status: "CANCELLED" } }),
    db.order.count({ where: { ...paid, status: "DELIVERED" } }),
    db.order.count({ where: { ...paid, status: { in: IN_PROGRESS } } }),
    db.payment.aggregate({ where: { order: paid }, _sum: { refundedAmount: true } }),
    db.order.groupBy({ by: ["status"], where: created, _count: true }),
    db.orderItem.groupBy({ by: ["mealName"], where: { order: paid }, _sum: { quantity: true, lineTotal: true }, orderBy: { _sum: { quantity: "desc" } }, take: 10 }),
    db.orderItem.groupBy({ by: ["mealType"], where: { order: paid }, _sum: { lineTotal: true, quantity: true } }),
    db.orderItem.groupBy({ by: ["litres"], where: { order: paid, mealType: "SPECIAL" }, _sum: { quantity: true, lineTotal: true }, orderBy: { litres: "asc" } }),
    db.$queryRaw<{ day: string; orders: number; revenue: string }[]>(Prisma.sql`
      SELECT to_char((("paidAt" AT TIME ZONE 'UTC') AT TIME ZONE ${tz}::text), 'YYYY-MM-DD') AS day, COUNT(*)::int AS orders, COALESCE(SUM("total"), 0)::text AS revenue
      FROM "Order" WHERE "paidAt" >= ${from} AND "paidAt" < ${to} AND "paymentStatus" IN ('SUCCESSFUL', 'REFUNDED') GROUP BY 1`),
  ]);

  const gross = dec(paidAgg._sum.total);
  const refunded = dec(refunds._sum.refundedAmount);
  const paidCount = paidAgg._count;

  // Fill days with no sales so charts show real zeros instead of skipping dates.
  const byDay = new Map(trendRows.map((r) => [r.day, r]));
  const trend: { day: string; orders: number; revenue: string }[] = [];
  for (let d = from; d < to && trend.length < 400; d = addLocalDays(d, 1, tz)) {
    const p = localParts(d, tz);
    const key = `${p.y}-${String(p.m + 1).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`;
    const r = byDay.get(key);
    trend.push({ day: key, orders: r?.orders ?? 0, revenue: toMoneyString(r?.revenue ?? 0) });
  }

  const typeRevenue = (t: "NORMAL" | "SPECIAL") => toMoneyString(dec(byType.find((x) => x.mealType === t)?._sum.lineTotal));

  return {
    grossRevenue: toMoneyString(gross), refunds: toMoneyString(refunded), netRevenue: toMoneyString(gross.minus(refunded)),
    ordersPlaced: placed, successfulPayments: paidCount, deliveredOrders: delivered, cancelledOrders: cancelled, pendingFulfilment: inProgress,
    averageOrderValue: toMoneyString(paidCount ? gross.dividedBy(paidCount).toDecimalPlaces(2) : 0),
    normalRevenue: typeRevenue("NORMAL"), specialRevenue: typeRevenue("SPECIAL"),
    statusDistribution: byStatus.map((s) => ({ status: s.status, count: s._count })),
    bestSellers: best.map((b) => ({ name: b.mealName, quantity: b._sum.quantity ?? 0, revenue: toMoneyString(dec(b._sum.lineTotal)) })),
    litreDistribution: byLitre.filter((l) => l.litres != null).map((l) => ({ litres: l.litres!.toString(), quantity: l._sum.quantity ?? 0, revenue: toMoneyString(dec(l._sum.lineTotal)) })),
    trend,
  };
}
export type Analytics = Awaited<ReturnType<typeof getAnalytics>>;

export async function getRecentOrders(take = 8) {
  return db.order.findMany({ orderBy: { createdAt: "desc" }, take, select: { id: true, reference: true, customerName: true, total: true, status: true, paymentStatus: true, createdAt: true } });
}

/** Operational counts that do not depend on the date filter. */
export async function getLiveCounts() {
  const [awaitingAction, outForDelivery, unavailableMeals] = await Promise.all([
    db.order.count({ where: { status: "PAID" } }),
    db.order.count({ where: { status: "OUT_FOR_DELIVERY" } }),
    db.meal.count({ where: { archivedAt: null, isAvailable: false } }),
  ]);
  return { awaitingAction, outForDelivery, unavailableMeals };
}
