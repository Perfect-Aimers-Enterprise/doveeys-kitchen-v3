import Link from "next/link";
import { Card, Empty, OrderBadge, PaymentBadge, PageHeader, Stat, Table, Td, Th } from "@/components/admin/ui";
import { MealChart, OrdersChart, RevenueChart, StatusChart } from "@/components/dashboard/charts";
import { RangeFilter } from "@/components/dashboard/range-filter";
import { getAnalytics, getLiveCounts, getRecentOrders } from "@/services/analytics.service";
import { getSetting } from "@/services/settings.service";
import { fmtDateTime } from "@/utils/format";
import { formatMoney } from "@/utils/money";
import { resolveRange } from "@/utils/tz";

export const metadata = { title: "Overview" };

export default async function DashboardPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const [tz, currency] = await Promise.all([getSetting("reports.timezone"), getSetting("business.currency")]);
  const range = resolveRange(await searchParams, tz);
  const [a, recent, live] = await Promise.all([getAnalytics(range.from, range.to, tz), getRecentOrders(8), getLiveCounts()]);
  const m = (v: string) => formatMoney(v, currency);

  return (
    <>
      <PageHeader title="Overview" subtitle="Live figures calculated from your orders and payments." />
      <RangeFilter range={range} path="/admin/dashboard" />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Total paid revenue" value={m(a.grossRevenue)} hint={`Net after refunds: ${m(a.netRevenue)}`} />
        <Stat label="Total orders" value={a.ordersPlaced} hint="All orders started, paid or not" />
        <Stat label="Successful payments" value={a.successfulPayments} />
        <Stat label="Average order value" value={m(a.averageOrderValue)} />
        <Stat label="Pending fulfilment" value={a.pendingFulfilment} hint="Paid, not yet delivered" />
        <Stat label="Delivered orders" value={a.deliveredOrders} />
        <Stat label="Cancelled orders" value={a.cancelledOrders} />
        <Stat label="Refunded" value={m(a.refunds)} />
      </div>

      {(live.awaitingAction > 0 || live.outForDelivery > 0) && (
        <div className="mt-4 flex flex-wrap gap-3 rounded-lg border border-orange/40 bg-orange/10 px-4 py-3 text-sm">
          {live.awaitingAction > 0 && <Link className="underline underline-offset-2" href="/admin/orders?status=PAID">{live.awaitingAction} paid order{live.awaitingAction === 1 ? "" : "s"} waiting to be confirmed</Link>}
          {live.outForDelivery > 0 && <Link className="underline underline-offset-2" href="/admin/orders?status=OUT_FOR_DELIVERY">{live.outForDelivery} out for delivery</Link>}
          {live.unavailableMeals > 0 && <Link className="underline underline-offset-2" href="/admin/meals">{live.unavailableMeals} meal{live.unavailableMeals === 1 ? "" : "s"} marked unavailable</Link>}
        </div>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card title="Revenue trend"><RevenueChart data={a.trend} currency={currency} /></Card>
        <Card title="Order trend"><OrdersChart data={a.trend} /></Card>
        <Card title="Meal performance"><MealChart data={a.bestSellers} /></Card>
        <Card title="Order status"><StatusChart data={a.statusDistribution} /></Card>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-5">
        <Card title="Best-selling meals" className="lg:col-span-2">
          {a.bestSellers.length === 0 ? <p className="text-sm text-text-2">No paid orders in this period.</p> : (
            <ol className="space-y-3">{a.bestSellers.slice(0, 5).map((b, i) => (
              <li key={b.name} className="flex items-baseline justify-between gap-3 text-sm"><span className="min-w-0 truncate"><span className="mr-2 text-text-2">{i + 1}.</span>{b.name}</span><span className="shrink-0 text-text-2">{b.quantity} sold · {m(b.revenue)}</span></li>
            ))}</ol>
          )}
        </Card>
        <div className="lg:col-span-3">
          <h2 className="mb-3 text-xl font-semibold">Recent orders</h2>
          {recent.length === 0 ? <Empty title="No orders yet" text="Orders appear here as soon as customers start checking out." /> : (
            <Table>
              <thead><tr><Th>Order</Th><Th className="hidden sm:table-cell">Customer</Th><Th>Total</Th><Th>Status</Th><Th className="hidden md:table-cell">Payment</Th></tr></thead>
              <tbody>{recent.map((o) => (
                <tr key={o.id}>
                  <Td><Link className="font-medium underline-offset-2 hover:underline" href={`/admin/orders/${o.id}`}>{o.reference}</Link><div className="text-xs text-text-2">{fmtDateTime(o.createdAt, tz)}</div></Td>
                  <Td className="hidden sm:table-cell">{o.customerName}</Td><Td className="tabular-nums">{m(o.total.toString())}</Td>
                  <Td><OrderBadge status={o.status} /></Td><Td className="hidden md:table-cell"><PaymentBadge status={o.paymentStatus} /></Td>
                </tr>
              ))}</tbody>
            </Table>
          )}
        </div>
      </div>
    </>
  );
}
