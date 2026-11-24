import Link from "next/link";
import { notFound } from "next/navigation";
import { OrderControls, RefundForm } from "@/components/admin/order-controls";
import { Badge, Card, OrderBadge, PageHeader, PaymentBadge, Table, Td, Th, btnGhost } from "@/components/admin/ui";
import type { OrderStatus } from "@/lib/order-status";
import { getOrderDetail } from "@/services/order-query.service";
import { getSetting } from "@/services/settings.service";
import { fmtDateTime, titleCase } from "@/utils/format";
import { formatMoney, money, toMoneyString } from "@/utils/money";

export const metadata = { title: "Order" };

const Row = ({ k, v }: { k: string; v: React.ReactNode }) => <div className="flex justify-between gap-4 py-1.5 text-sm"><dt className="text-text-2">{k}</dt><dd className="min-w-0 break-words text-right">{v}</dd></div>;

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const [order, tz] = await Promise.all([getOrderDetail((await params).id), getSetting("reports.timezone")]);
  if (!order) notFound();
  const m = (v: { toString(): string }) => formatMoney(v.toString(), order.currency);
  const refunded = money(order.payment?.refundedAmount ?? 0);
  const remaining = order.payment ? money(order.payment.amount).minus(refunded) : money(0);
  const paid = order.paymentStatus === "SUCCESSFUL" || order.paymentStatus === "REFUNDED";

  return (
    <>
      <PageHeader title={`Order ${order.reference}`} subtitle={`Placed ${fmtDateTime(order.createdAt, tz)}`} actions={<Link href="/admin/orders" className={btnGhost}>All orders</Link>} />
      <div className="mb-6 flex flex-wrap gap-2"><OrderBadge status={order.status} /><PaymentBadge status={order.paymentStatus} /></div>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Card title="Manage order"><OrderControls orderId={order.id} status={order.status as OrderStatus} paymentStatus={order.paymentStatus} /></Card>

          <Card title="Items">
            <Table>
              <thead><tr><Th>Meal</Th><Th className="text-right">Unit</Th><Th className="text-right">Qty</Th><Th className="text-right">Total</Th></tr></thead>
              <tbody>
                {order.items.map((i) => (
                  <tr key={i.id}><Td>{i.mealName}{i.litres && <span className="ml-2"><Badge tone="orange">{i.litres.toString()} L</Badge></span>}</Td><Td className="text-right tabular-nums">{m(i.unitPrice)}</Td><Td className="text-right">{i.quantity}</Td><Td className="text-right tabular-nums">{m(i.lineTotal)}</Td></tr>
                ))}
                <tr><Td className="text-text-2" >Subtotal</Td><Td /><Td /><Td className="text-right tabular-nums">{m(order.subtotal)}</Td></tr>
                <tr><Td className="text-text-2">Delivery{order.deliveryZoneName ? ` (${order.deliveryZoneName})` : ""}</Td><Td /><Td /><Td className="text-right tabular-nums">{m(order.deliveryFee)}</Td></tr>
                <tr><Td className="font-semibold">Total</Td><Td /><Td /><Td className="text-right font-semibold tabular-nums">{m(order.total)}</Td></tr>
              </tbody>
            </Table>
            <p className="mt-2 text-xs text-text-2">Prices are the amounts at the time of the order. Later menu or delivery fee changes do not affect them.</p>
          </Card>

          <Card title="History">
            <ol className="space-y-3">
              {order.history.map((h) => (
                <li key={h.id} className="text-sm"><span className="font-medium">{h.fromStatus && h.fromStatus !== h.toStatus ? `${titleCase(h.fromStatus)} → ` : ""}{titleCase(h.toStatus)}</span>
                  <span className="text-text-2"> · {fmtDateTime(h.createdAt, tz)} · {h.admin?.name ?? "System"}</span>{h.note && <p className="text-text-2">{h.note}</p>}</li>
              ))}
            </ol>
          </Card>
        </div>

        <div className="space-y-4">
          <Card title="Customer">
            <dl>
              <Row k="Name" v={order.customerName} /><Row k="Email" v={<a className="underline" href={`mailto:${order.customerEmail}`}>{order.customerEmail}</a>} />
              <Row k="Phone" v={<a className="underline" href={`tel:${order.customerPhone.replace(/\s/g, "")}`}>{order.customerPhone}</a>} />
            </dl>
          </Card>
          <Card title="Delivery">
            <p className="whitespace-pre-line text-sm">{order.deliveryAddress}</p>
            {order.deliveryZoneName && <p className="mt-2 text-xs text-text-2">Area: {order.deliveryZoneName}</p>}
            {order.deliveryNotes && <p className="mt-3 rounded-md bg-bg-2 p-3 text-sm"><strong>Notes: </strong>{order.deliveryNotes}</p>}
          </Card>
          <Card title="Payment">
            {order.payment ? (
              <>
                <dl>
                  <Row k="Status" v={<PaymentBadge status={order.paymentStatus} />} /><Row k="Amount" v={m(order.payment.amount)} />
                  <Row k="Paystack reference" v={<code className="text-xs">{order.payment.paystackReference}</code>} /><Row k="Channel" v={order.payment.channel ?? "—"} />
                  <Row k="Verified" v={fmtDateTime(order.payment.verifiedAt, tz)} />{refunded.gt(0) && <Row k="Refunded" v={m(refunded.toFixed(2))} />}
                </dl>
                {paid && remaining.gt(0) && <div className="mt-4"><RefundForm orderId={order.id} remaining={toMoneyString(remaining)} currency={order.currency} /></div>}
              </>
            ) : <p className="text-sm text-text-2">Checkout was not completed, so no payment exists for this order.</p>}
          </Card>
          <Card title="Emails sent">
            {order.emails.length === 0 ? <p className="text-sm text-text-2">No emails yet.</p> : (
              <ul className="space-y-2 text-sm">{order.emails.map((e) => <li key={e.id} className="flex items-start justify-between gap-2"><span className="min-w-0 break-words">{e.template}<span className="block text-xs text-text-2">{e.to}</span>{e.error && <span className="block text-xs text-red-700 dark:text-red-400">{e.error}</span>}</span><Badge tone={e.status === "SENT" ? "green" : e.status === "FAILED" ? "red" : "gray"}>{titleCase(e.status)}</Badge></li>)}</ul>
            )}
          </Card>
        </div>
      </div>
    </>
  );
}
