import { Card, PageHeader, Stat, Table, Td, Th } from "@/components/admin/ui";
import { MealChart, OrdersChart, RevenueChart, StatusChart } from "@/components/dashboard/charts";
import { RangeFilter } from "@/components/dashboard/range-filter";
import { getAnalytics } from "@/services/analytics.service";
import { getSetting } from "@/services/settings.service";
import { titleCase } from "@/utils/format";
import { formatMoney } from "@/utils/money";
import { resolveRange } from "@/utils/tz";

export const metadata = { title: "Analytics" };

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const [tz, currency] = await Promise.all([getSetting("reports.timezone"), getSetting("business.currency")]);
  const range = resolveRange(await searchParams, tz);
  const a = await getAnalytics(range.from, range.to, tz);
  const m = (v: string) => formatMoney(v, currency);
  return (
    <>
      <PageHeader title="Analytics" subtitle="Paid revenue, refunds and net revenue are kept separate. Only verified payments count as sales." />
      <RangeFilter range={range} path="/admin/analytics" />
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Paid revenue" value={m(a.grossRevenue)} /><Stat label="Refunded" value={m(a.refunds)} /><Stat label="Net revenue" value={m(a.netRevenue)} /><Stat label="Average order value" value={m(a.averageOrderValue)} />
        <Stat label="Normal meal revenue" value={m(a.normalRevenue)} hint="Excludes delivery" /><Stat label="Special meal revenue" value={m(a.specialRevenue)} hint="Excludes delivery" /><Stat label="Pending orders" value={a.pendingFulfilment} hint="Paid, awaiting delivery" /><Stat label="Cancelled orders" value={a.cancelledOrders} />
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card title="Revenue trend"><RevenueChart data={a.trend} currency={currency} /></Card>
        <Card title="Order trend"><OrdersChart data={a.trend} /></Card>
        <Card title="Meal performance"><MealChart data={a.bestSellers} /></Card>
        <Card title="Order status"><StatusChart data={a.statusDistribution} /></Card>
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <div><h2 className="mb-3 text-xl font-semibold">Best-selling meals</h2>
          <Table><thead><tr><Th>#</Th><Th>Meal</Th><Th className="text-right">Qty</Th><Th className="text-right">Revenue</Th></tr></thead>
            <tbody>{a.bestSellers.map((b, i) => <tr key={b.name}><Td>{i + 1}</Td><Td>{b.name}</Td><Td className="text-right tabular-nums">{b.quantity}</Td><Td className="text-right tabular-nums">{m(b.revenue)}</Td></tr>)}
              {!a.bestSellers.length && <tr><Td>No sales in this period.</Td><Td /><Td /><Td /></tr>}</tbody></Table></div>
        <div><h2 className="mb-3 text-xl font-semibold">Special meals by litre</h2>
          <Table><thead><tr><Th>Litres</Th><Th className="text-right">Sold</Th><Th className="text-right">Revenue</Th></tr></thead>
            <tbody>{a.litreDistribution.map((l) => <tr key={l.litres}><Td>{l.litres} L</Td><Td className="text-right tabular-nums">{l.quantity}</Td><Td className="text-right tabular-nums">{m(l.revenue)}</Td></tr>)}
              {!a.litreDistribution.length && <tr><Td>No special meals sold in this period.</Td><Td /><Td /></tr>}</tbody></Table>
          <h2 className="mb-3 mt-6 text-xl font-semibold">Orders by status</h2>
          <Table><thead><tr><Th>Status</Th><Th className="text-right">Orders</Th></tr></thead>
            <tbody>{a.statusDistribution.map((s) => <tr key={s.status}><Td>{titleCase(s.status)}</Td><Td className="text-right tabular-nums">{s.count}</Td></tr>)}</tbody></Table></div>
      </div>
    </>
  );
}
