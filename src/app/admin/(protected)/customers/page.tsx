import Link from "next/link";
import { Empty, PageHeader, Pagination, Table, Td, Th, btnGhost, inputCls } from "@/components/admin/ui";
import { listCustomers } from "@/services/customer.service";
import { getSetting } from "@/services/settings.service";
import { fmtDate } from "@/utils/format";
import { formatMoney } from "@/utils/money";

export const metadata = { title: "Customers" };

export default async function CustomersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const sort = sp.sort === "spent" || sp.sort === "orders" ? sp.sort : "recent";
  const [r, tz, currency] = await Promise.all([listCustomers({ q: sp.q?.trim() || undefined, page: Number(sp.page) || 1, sort }), getSetting("reports.timezone"), getSetting("business.currency")]);
  return (
    <>
      <PageHeader title="Customers" subtitle="Built from paid orders. There are no customer accounts, so customers are matched by email address." />
      <form className="mb-4 flex flex-wrap gap-2" role="search">
        <input name="q" defaultValue={sp.q} placeholder="Name, email or phone" aria-label="Search customers" className={`${inputCls} max-w-xs`} />
        <select name="sort" defaultValue={sort} aria-label="Sort" className={`${inputCls} w-48`}><option value="recent">Most recent order</option><option value="spent">Highest spend</option><option value="orders">Most orders</option></select>
        <button className={btnGhost}>Apply</button>{sp.q && <Link className={btnGhost} href="/admin/customers">Clear</Link>}
      </form>
      {r.customers.length === 0 ? <Empty title={sp.q ? "No customers match" : "No customers yet"} text="Customers appear after their first successful payment." /> : (
        <>
          <p className="mb-2 text-sm text-text-2">{r.total} customer{r.total === 1 ? "" : "s"}</p>
          <Table>
            <thead><tr><Th>Customer</Th><Th className="hidden md:table-cell">Phone</Th><Th className="text-right">Orders</Th><Th className="text-right">Total spent</Th><Th className="hidden sm:table-cell">Last order</Th></tr></thead>
            <tbody>{r.customers.map((c) => (
              <tr key={c.email}><Td><div className="font-medium">{c.name}</div><a className="text-xs text-text-2 underline" href={`mailto:${c.email}`}>{c.email}</a></Td>
                <Td className="hidden md:table-cell">{c.phone}</Td><Td className="text-right tabular-nums">{c.orders}</Td><Td className="text-right tabular-nums">{formatMoney(c.spent, currency)}</Td><Td className="hidden sm:table-cell">{fmtDate(c.last, tz)}</Td></tr>
            ))}</tbody>
          </Table>
          <Pagination page={r.page} pages={Math.max(1, Math.ceil(r.total / r.pageSize))} path="/admin/customers" params={{ q: sp.q, sort: sp.sort }} />
        </>
      )}
    </>
  );
}
