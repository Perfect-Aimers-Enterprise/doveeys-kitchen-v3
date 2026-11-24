"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowDown, ArrowUp, Pencil, Trash2 } from "lucide-react";
import { btnDanger, btnGhost, btnPrimary, inputCls } from "@/components/admin/ui";
import { api, ApiError } from "@/lib/admin-fetch";

type Cat = { id: string; name: string; meals: number };

export function CategoryManager({ initial }: { initial: Cat[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<unknown>) {
    setBusy(true); setError(null);
    try { await fn(); router.refresh(); } catch (e) { setError(e instanceof ApiError ? (e.fields.name ?? e.message) : "Something went wrong."); } finally { setBusy(false); }
  }
  const move = (i: number, d: -1 | 1) => { const ids = initial.map((c) => c.id); [ids[i], ids[i + d]] = [ids[i + d], ids[i]]; return run(() => api("/api/admin/categories/reorder", { body: { ids } })); };

  return (
    <div className="max-w-2xl">
      <form className="mb-4 flex gap-2" onSubmit={(e) => { e.preventDefault(); run(async () => { await api("/api/admin/categories", { body: { name } }); setName(""); }); }}>
        <input className={inputCls} placeholder="New category name" aria-label="New category name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
        <button className={btnPrimary} disabled={busy || name.trim().length < 2}>Add</button>
      </form>
      {error && <p role="alert" className="mb-3 text-sm text-red-700 dark:text-red-400">{error}</p>}
      <ul className="divide-y divide-border rounded-lg border border-border bg-card">
        {initial.map((c, i) => (
          <li key={c.id} className="flex items-center gap-2 px-4 py-3">
            <div className="min-w-0 flex-1"><p className="truncate font-medium">{c.name}</p><p className="text-xs text-text-2">{c.meals} meal{c.meals === 1 ? "" : "s"}</p></div>
            <button className={`${btnGhost} size-9 px-0`} aria-label={`Move ${c.name} up`} disabled={i === 0 || busy} onClick={() => move(i, -1)}><ArrowUp size={15} /></button>
            <button className={`${btnGhost} size-9 px-0`} aria-label={`Move ${c.name} down`} disabled={i === initial.length - 1 || busy} onClick={() => move(i, 1)}><ArrowDown size={15} /></button>
            <button className={`${btnGhost} size-9 px-0`} aria-label={`Rename ${c.name}`} disabled={busy} onClick={() => { const n = prompt("Rename category", c.name); if (n && n.trim() && n !== c.name) run(() => api(`/api/admin/categories/${c.id}`, { method: "PATCH", body: { name: n.trim() } })); }}><Pencil size={15} /></button>
            <button className={`${btnDanger} size-9 px-0`} aria-label={`Archive ${c.name}`} disabled={busy} onClick={() => { if (confirm(`Archive “${c.name}”? Its meals stay on the menu but lose this category.`)) run(() => api(`/api/admin/categories/${c.id}`, { method: "DELETE" })); }}><Trash2 size={15} /></button>
          </li>
        ))}
        {initial.length === 0 && <li className="px-4 py-8 text-center text-sm text-text-2">No categories yet.</li>}
      </ul>
    </div>
  );
}
