"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowDown, ArrowUp, Archive, ArchiveRestore, Pencil } from "lucide-react";
import { Badge, btnDanger, btnGhost, Table, Td, Th } from "@/components/admin/ui";
import { api, ApiError } from "@/lib/admin-fetch";

export type MealRow = {
  id: string; name: string; slug: string; type: "NORMAL" | "SPECIAL"; price: string | null; options: { litres: string; price: string }[];
  image: string | null; category: string | null; isAvailable: boolean; isFeatured: boolean; archived: boolean;
};

export function MealList({ meals, currency, canReorder }: { meals: MealRow[]; currency: string; canReorder: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const money = (v: string) => new Intl.NumberFormat("en-NG", { style: "currency", currency, maximumFractionDigits: 0 }).format(Number(v));

  async function run(id: string, fn: () => Promise<unknown>) {
    setBusy(id); setError(null);
    try { await fn(); router.refresh(); } catch (e) { setError(e instanceof ApiError ? e.message : "Something went wrong."); } finally { setBusy(null); }
  }
  const move = (i: number, dir: -1 | 1) => {
    const ids = meals.map((m) => m.id);
    [ids[i], ids[i + dir]] = [ids[i + dir], ids[i]];
    return run(meals[i].id, () => api("/api/admin/meals/reorder", { body: { ids } }));
  };

  return (
    <>
      {error && <p role="alert" className="mb-3 text-sm text-red-700 dark:text-red-400">{error}</p>}
      <Table>
        <thead><tr><Th>Meal</Th><Th className="hidden md:table-cell">Price</Th><Th className="hidden lg:table-cell">Category</Th><Th>Available</Th><Th className="hidden sm:table-cell">Featured</Th><Th className="text-right">Actions</Th></tr></thead>
        <tbody>
          {meals.map((m, i) => (
            <tr key={m.id} className={m.archived ? "opacity-60" : ""}>
              <Td>
                <div className="flex items-center gap-3">
                  {m.image ? <img src={m.image} alt="" width={44} height={44} className="size-11 rounded-md object-cover" loading="lazy" /> : <div className="grid size-11 place-items-center rounded-md bg-bg-2 text-[10px] text-text-2">No image</div>}
                  <div className="min-w-0"><p className="truncate font-medium">{m.name}</p><p className="text-xs text-text-2">{m.type === "SPECIAL" ? `Special · ${m.options.length} size${m.options.length === 1 ? "" : "s"}` : "Normal"}{m.archived && " · Archived"}</p></div>
                </div>
              </Td>
              <Td className="hidden whitespace-nowrap tabular-nums md:table-cell">
                {m.type === "NORMAL" ? (m.price ? money(m.price) : "—") : m.options.length ? `${money(m.options[0].price)} – ${money(m.options[m.options.length - 1].price)}` : "—"}
              </Td>
              <Td className="hidden lg:table-cell">{m.category ?? <span className="text-text-2">None</span>}</Td>
              <Td>
                <button disabled={busy === m.id || m.archived} aria-pressed={m.isAvailable} onClick={() => run(m.id, () => api(`/api/admin/meals/${m.id}`, { method: "PATCH", body: { isAvailable: !m.isAvailable } }))}>
                  <Badge tone={m.isAvailable ? "green" : "gray"}>{m.isAvailable ? "Available" : "Unavailable"}</Badge>
                </button>
              </Td>
              <Td className="hidden sm:table-cell">
                <button disabled={busy === m.id || m.archived} aria-pressed={m.isFeatured} onClick={() => run(m.id, () => api(`/api/admin/meals/${m.id}`, { method: "PATCH", body: { isFeatured: !m.isFeatured } }))}>
                  <Badge tone={m.isFeatured ? "orange" : "gray"}>{m.isFeatured ? "Featured" : "Not featured"}</Badge>
                </button>
              </Td>
              <Td>
                <div className="flex items-center justify-end gap-1.5">
                  {canReorder && !m.archived && <>
                    <button className={`${btnGhost} size-9 px-0`} aria-label={`Move ${m.name} up`} disabled={i === 0 || busy !== null} onClick={() => move(i, -1)}><ArrowUp size={15} /></button>
                    <button className={`${btnGhost} size-9 px-0`} aria-label={`Move ${m.name} down`} disabled={i === meals.length - 1 || busy !== null} onClick={() => move(i, 1)}><ArrowDown size={15} /></button>
                  </>}
                  <Link className={`${btnGhost} size-9 px-0`} href={`/admin/meals/${m.id}`} aria-label={`Edit ${m.name}`}><Pencil size={15} /></Link>
                  {m.archived
                    ? <button className={`${btnGhost} size-9 px-0`} aria-label={`Restore ${m.name}`} disabled={busy === m.id} onClick={() => run(m.id, () => api(`/api/admin/meals/${m.id}`, { method: "PATCH", body: { archived: false } }))}><ArchiveRestore size={15} /></button>
                    : <button className={`${btnDanger} size-9 px-0`} aria-label={`Archive ${m.name}`} disabled={busy === m.id} onClick={() => { if (confirm(`Archive “${m.name}”? It disappears from the menu. Past orders keep their details and you can restore it later.`)) run(m.id, () => api(`/api/admin/meals/${m.id}`, { method: "DELETE" })); }}><Archive size={15} /></button>}
                </div>
              </Td>
            </tr>
          ))}
        </tbody>
      </Table>
    </>
  );
}
