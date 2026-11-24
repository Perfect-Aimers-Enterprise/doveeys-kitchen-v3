"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { btnDanger, btnGhost, btnPrimary, inputCls } from "@/components/admin/ui";
import { api, ApiError } from "@/lib/admin-fetch";

type Zone = { id: string; name: string; fee: string; isActive: boolean };

export function ZonesManager({ initial }: { initial: Zone[] }) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [draft, setDraft] = useState({ name: "", fee: "" });
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<unknown>) {
    setBusy(true); setError(null);
    try { await fn(); router.refresh(); } catch (e) { setError(e instanceof ApiError ? Object.values(e.fields)[0] ?? e.message : "Something went wrong."); } finally { setBusy(false); }
  }
  const patch = (id: string, p: Partial<Zone>) => setRows((r) => r.map((z) => (z.id === id ? { ...z, ...p } : z)));

  return (
    <div className="space-y-3">
      {rows.length === 0 && <p className="rounded-md border border-dashed border-border p-4 text-sm text-text-2">No delivery areas. Customers are charged the default fee everywhere. Add areas to price them separately; once one is active, customers must choose an area at checkout.</p>}
      {rows.map((z) => (
        <div key={z.id} className="grid grid-cols-[1fr_8rem_auto] items-center gap-2 sm:grid-cols-[1fr_9rem_auto_auto_auto]">
          <input aria-label="Area name" className={inputCls} value={z.name} onChange={(e) => patch(z.id, { name: e.target.value })} />
          <input aria-label="Fee" inputMode="decimal" className={inputCls} value={z.fee} onChange={(e) => patch(z.id, { fee: e.target.value })} />
          <label className="hidden items-center gap-1.5 text-sm sm:flex"><input type="checkbox" checked={z.isActive} onChange={(e) => patch(z.id, { isActive: e.target.checked })} /> Active</label>
          <button className={`${btnGhost} h-11`} disabled={busy} onClick={() => run(() => api(`/api/admin/delivery-zones/${z.id}`, { method: "PUT", body: { name: z.name, fee: z.fee, isActive: z.isActive } }))}>Save</button>
          <button className={`${btnDanger} size-11 px-0`} aria-label={`Delete ${z.name}`} disabled={busy} onClick={() => { if (confirm(`Delete “${z.name}”? Past orders keep the fee they were charged.`)) run(async () => { await api(`/api/admin/delivery-zones/${z.id}`, { method: "DELETE" }); setRows((r) => r.filter((x) => x.id !== z.id)); }); }}><Trash2 size={15} /></button>
        </div>
      ))}
      <form className="grid grid-cols-[1fr_8rem_auto] gap-2 border-t border-border pt-4 sm:grid-cols-[1fr_9rem_auto]" onSubmit={(e) => { e.preventDefault(); run(async () => { const r = await api<{ zone: { id: string; name: string; fee: string; isActive: boolean } }>("/api/admin/delivery-zones", { body: { name: draft.name, fee: draft.fee, isActive: true } }); setRows((x) => [...x, { ...r.zone, fee: Number(r.zone.fee).toFixed(2) }]); setDraft({ name: "", fee: "" }); }); }}>
        <input aria-label="New area name" className={inputCls} placeholder="New delivery area" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
        <input aria-label="New area fee" inputMode="decimal" className={inputCls} placeholder="Fee" value={draft.fee} onChange={(e) => setDraft({ ...draft, fee: e.target.value })} />
        <button className={btnPrimary} disabled={busy || draft.name.trim().length < 2 || !draft.fee}>Add area</button>
      </form>
      {error && <p role="alert" className="text-sm text-red-700 dark:text-red-400">{error}</p>}
    </div>
  );
}
