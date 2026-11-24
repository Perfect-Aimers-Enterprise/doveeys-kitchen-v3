"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { btnDanger, btnGhost, btnPrimary, Field, inputCls } from "@/components/admin/ui";
import { api, ApiError } from "@/lib/admin-fetch";
import { STATUS_LABEL, TRANSITIONS, type OrderStatus } from "@/lib/order-status";

const ACTION_LABEL: Partial<Record<OrderStatus, string>> = { CONFIRMED: "Confirm order", PROCESSING: "Mark as processing", READY: "Mark as ready", OUT_FOR_DELIVERY: "Mark out for delivery", DELIVERED: "Mark as delivered" };

export function OrderControls({ orderId, status, paymentStatus }: { orderId: string; status: OrderStatus; paymentStatus: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);
  const paid = paymentStatus === "SUCCESSFUL" || paymentStatus === "REFUNDED";
  const next = TRANSITIONS[status].filter((s) => s !== "CANCELLED");
  const canCancel = TRANSITIONS[status].includes("CANCELLED");

  async function change(to: OrderStatus) {
    if (to === "CANCELLED" && !confirm("Cancel this order? The customer is emailed. If they already paid, record or issue the refund separately.")) return;
    setBusy(true); setError(null);
    try { await api(`/api/admin/orders/${orderId}/status`, { method: "PATCH", body: { status: to, note: note.trim() || undefined } }); setNote(""); router.refresh(); }
    catch (e) { setError(e instanceof ApiError ? e.message : "Something went wrong."); } finally { setBusy(false); }
  }

  if (!paid) return <p className="rounded-md bg-bg-2 p-4 text-sm text-text-2">This order has not been paid, so it cannot be processed. It will unlock automatically once Paystack confirms the payment.</p>;
  if (next.length === 0 && !canCancel) return <p className="text-sm text-text-2">This order is {STATUS_LABEL[status].toLowerCase()}. No further changes are possible.</p>;

  return (
    <div className="space-y-3">
      <Field label="Note (optional, saved in the history)" htmlFor="note"><input id="note" className={inputCls} value={note} maxLength={500} onChange={(e) => setNote(e.target.value)} /></Field>
      <div className="flex flex-wrap gap-2">
        {next.map((s) => <button key={s} className={btnPrimary} disabled={busy} onClick={() => change(s)}>{ACTION_LABEL[s] ?? STATUS_LABEL[s]}</button>)}
        {canCancel && <button className={btnDanger} disabled={busy} onClick={() => change("CANCELLED")}>Cancel order</button>}
      </div>
      {error && <p role="alert" className="text-sm text-red-700 dark:text-red-400">{error}</p>}
    </div>
  );
}

export function RefundForm({ orderId, remaining, currency }: { orderId: string; remaining: string; currency: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState(remaining);
  const [note, setNote] = useState("");
  const [err, setErr] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (!open) return <button className={btnGhost} onClick={() => setOpen(true)}>Record a refund</button>;
  return (
    <form className="space-y-3 rounded-md border border-border p-4" onSubmit={async (e) => {
      e.preventDefault(); setBusy(true); setErr({}); setMsg(null);
      try { await api(`/api/admin/orders/${orderId}/refund`, { body: { amount, note: note.trim() || undefined } }); setOpen(false); router.refresh(); }
      catch (x) { if (x instanceof ApiError) { setErr(x.fields); setMsg(x.message); } } finally { setBusy(false); }
    }}>
      <p className="text-xs text-text-2">Use this after you refund the customer in your Paystack dashboard. It keeps your revenue figures correct; it does not send money. Remaining: {currency} {remaining}.</p>
      <Field label="Amount refunded" htmlFor="refund-amount" error={err.amount}><input id="refund-amount" className={inputCls} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} /></Field>
      <Field label="Note (optional)" htmlFor="refund-note"><input id="refund-note" className={inputCls} value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} /></Field>
      {msg && !err.amount && <p role="alert" className="text-sm text-red-700 dark:text-red-400">{msg}</p>}
      <div className="flex gap-2"><button className={btnPrimary} disabled={busy}>Save refund</button><button type="button" className={btnGhost} onClick={() => setOpen(false)}>Cancel</button></div>
    </form>
  );
}
