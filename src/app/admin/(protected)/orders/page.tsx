import Link from "next/link";
import { Empty, OrderBadge, PageHeader, PaymentBadge, Pagination, Table, Td, Th, btnGhost, inputCls } from "@/components/admin/ui";
import { listOrders } from "@/services/order-query.service";
import { getSetting } from "@/services/settings.service";
import { fmtDateTime, titleCase } from "@/utils/format";
import { formatMoney } from "@/utils/money";
import { resolveRange } from "@/utils/tz";

export const metadata = { title: "Orders" };
const STATUSES = ["PENDING_PAYMENT", "PAID", "CONFIRMED", "PROCESSING", "READY", "OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"];

export default async function OrdersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const [tz, currency] = await Promise.all([getSetting("reports.timezone"), getSetting("business.currency")]);
  const range = sp.from && sp.to ? resolveRange({ range: "custom", from: sp.from, to: sp.to }, tz) : null;
  const r = await listOrders({ q: sp.q?.trim() || undefined, status: sp.status, payment: sp.payment, from: range?.from, to: range?.to, page: Number(sp.page) || 1 });
  const filtered = Boolean(sp.q || sp.status || sp.payment || range);
  return (
    <>
      <PageHeader title="Orders" subtitle={`${r.total} order${r.total === 1 ? "" : "s"}${filtered ? " match your filters" : ""}`} />
      <form className="mb-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-6" role="search">
        <input name="q" defaultValue={sp.q} placeholder="Reference, name, email, phone" aria-label="Search orders" className={`${inputCls} lg:col-span-2`} />
        <select name="status" defaultValue={sp.status ?? ""} aria-label="Fulfilment status" className={inputCls}><option value="">Any status</option>{STATUSES.map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}</select>
        <select name="payment" defaultValue={sp.payment ?? ""} aria-label="Payment status" className={inputCls}><option value="">Any payment</option>{["PENDING", "SUCCESSFUL", "FAILED", "REFUNDED"].map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}</select>
        <input type="date" name="from" defaultValue={sp.from} aria-label="From date" className={inputCls} />
        <input type="date" name="to" defaultValue={sp.to} aria-label="To date" className={inputCls} />
        <div className="flex gap-2 sm:col-span-2 lg:col-span-6"><button className={btnGhost}>Apply filters</button>{filtered && <Link className={btnGhost} href="/admin/orders">Clear</Link>}</div>
      </form>
      {r.orders.length === 0 ? <Empty title={filtered ? "No orders match" : "No orders yet"} text={filtered ? "Try changing or clearing the filters." : "Orders appear here when customers check out."} /> : (
        <>
          <Table>
            <thead><tr><Th>Order</Th><Th className="hidden sm:table-cell">Customer</Th><Th className="hidden lg:table-cell">Items</Th><Th>Total</Th><Th>Status</Th><Th className="hidden md:table-cell">Payment</Th></tr></thead>
            <tbody>{r.orders.map((o) => (
              <tr key={o.id}>
                <Td><Link className="font-medium underline-offset-2 hover:underline" href={`/admin/orders/${o.id}`}>{o.reference}</Link><div className="text-xs text-text-2">{fmtDateTime(o.createdAt, tz)}</div><div className="text-xs text-text-2 sm:hidden">{o.customerName}</div></Td>
                <Td className="hidden sm:table-cell"><div>{o.customerName}</div><div className="text-xs text-text-2">{o.customerPhone}</div></Td>
                <Td className="hidden lg:table-cell">{o._count.items}</Td>
                <Td className="whitespace-nowrap tabular-nums">{formatMoney(o.total.toString(), currency)}</Td>
                <Td><OrderBadge status={o.status} /></Td><Td className="hidden md:table-cell"><PaymentBadge status={o.paymentStatus} /></Td>
              </tr>
            ))}</tbody>
          </Table>
          <Pagination page={r.page} pages={r.pages} path="/admin/orders" params={{ q: sp.q, status: sp.status, payment: sp.payment, from: sp.from, to: sp.to }} />
        </>
      )}
    </>
  );
}
