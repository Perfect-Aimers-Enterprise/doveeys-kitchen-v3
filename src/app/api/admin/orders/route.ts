import { ok } from "@/lib/api";
import { adminRoute } from "@/lib/admin-route";
import { listOrders } from "@/services/order-query.service";
import { resolveRange } from "@/utils/tz";
import { getSetting } from "@/services/settings.service";

export const runtime = "nodejs";

export const GET = adminRoute(async ({ req }) => {
  const p = new URL(req.url).searchParams;
  const tz = await getSetting("reports.timezone");
  const range = p.get("from") || p.get("to") ? resolveRange({ range: "custom", from: p.get("from") ?? undefined, to: p.get("to") ?? undefined }, tz) : null;
  const r = await listOrders({ q: p.get("q")?.trim() || undefined, status: p.get("status") ?? undefined, payment: p.get("payment") ?? undefined, from: range?.from, to: range?.to, page: Number(p.get("page")) || 1 });
  return ok({ orders: r.orders, total: r.total, page: r.page, pages: r.pages });
});
