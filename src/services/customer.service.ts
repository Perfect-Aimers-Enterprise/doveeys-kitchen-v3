import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { toMoneyString } from "@/utils/money";

/** There is no customer account system: customers are derived from paid orders, keyed by email. */
export async function listCustomers(p: { q?: string; page?: number; pageSize?: number; sort?: "recent" | "spent" | "orders" }) {
  const pageSize = p.pageSize ?? 25, page = Math.max(1, p.page ?? 1), offset = (page - 1) * pageSize;
  const like = p.q ? `%${p.q.replace(/[%_\\]/g, "\\$&")}%` : null;
  const search = like ? Prisma.sql`AND ("customerName" ILIKE ${like} OR "customerEmail" ILIKE ${like} OR "customerPhone" ILIKE ${like})` : Prisma.empty;
  const order = p.sort === "spent" ? Prisma.sql`spent DESC` : p.sort === "orders" ? Prisma.sql`orders DESC` : Prisma.sql`last DESC`;

  const [rows, total] = await Promise.all([
    db.$queryRaw<{ email: string; name: string; phone: string; orders: number; spent: string; last: Date }[]>(Prisma.sql`
      SELECT lower("customerEmail") AS email,
             (array_agg("customerName" ORDER BY "createdAt" DESC))[1] AS name,
             (array_agg("customerPhone" ORDER BY "createdAt" DESC))[1] AS phone,
             COUNT(*)::int AS orders, COALESCE(SUM("total"), 0)::text AS spent, MAX("createdAt") AS last
      FROM "Order" WHERE "paymentStatus" IN ('SUCCESSFUL', 'REFUNDED') ${search}
      GROUP BY 1 ORDER BY ${order} LIMIT ${pageSize} OFFSET ${offset}`),
    db.$queryRaw<{ n: number }[]>(Prisma.sql`SELECT COUNT(DISTINCT lower("customerEmail"))::int AS n FROM "Order" WHERE "paymentStatus" IN ('SUCCESSFUL', 'REFUNDED') ${search}`),
  ]);
  return { customers: rows.map((r) => ({ ...r, spent: toMoneyString(r.spent) })), total: total[0]?.n ?? 0, page, pageSize };
}
