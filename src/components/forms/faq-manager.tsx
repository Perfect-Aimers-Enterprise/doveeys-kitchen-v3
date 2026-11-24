"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { btnDanger, btnGhost, btnPrimary, inputCls, textareaCls } from "@/components/admin/ui";
import { api, ApiError } from "@/lib/admin-fetch";

type Faq = { question: string; answer: string };

export function FaqManager({ initial }: { initial: Faq[] }) {
  const router = useRouter();
  const [items, setItems] = useState<Faq[]>(initial);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const edit = (i: number, p: Partial<Faq>) => setItems((x) => x.map((f, j) => (j === i ? { ...f, ...p } : f)));
  const move = (i: number, d: -1 | 1) => setItems((x) => { const n = [...x]; [n[i], n[i + d]] = [n[i + d], n[i]]; return n; });

  async function save() {
    setBusy(true); setMsg(null);
    try { await api("/api/admin/faqs", { method: "PUT", body: { items: items.map((f) => ({ question: f.question.trim(), answer: f.answer.trim() })) } }); setMsg({ ok: true, text: "Saved." }); router.refresh(); }
    catch (e) { setMsg({ ok: false, text: e instanceof ApiError ? (Object.values(e.fields)[0] ?? e.message) : "Something went wrong." }); } finally { setBusy(false); }
  }

  return (
    <div className="max-w-3xl space-y-4">
      {items.length === 0 && <p className="rounded-md border border-dashed border-border p-4 text-sm text-text-2">No FAQs yet. Add as many questions as you need; they appear on the FAQ page and help search engines show your answers.</p>}
      {items.map((f, i) => (
        <div key={i} className="space-y-2 rounded-lg border border-border bg-card p-4">
          <input aria-label={`Question ${i + 1}`} className={inputCls} placeholder="Question" value={f.question} maxLength={300} onChange={(e) => edit(i, { question: e.target.value })} />
          <textarea aria-label={`Answer ${i + 1}`} className={textareaCls} placeholder="Answer" value={f.answer} maxLength={3000} onChange={(e) => edit(i, { answer: e.target.value })} />
          <div className="flex gap-1.5">
            <button type="button" className={`${btnGhost} size-9 px-0`} aria-label="Move up" disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp size={15} /></button>
            <button type="button" className={`${btnGhost} size-9 px-0`} aria-label="Move down" disabled={i === items.length - 1} onClick={() => move(i, 1)}><ArrowDown size={15} /></button>
            <button type="button" className={`${btnDanger} size-9 px-0`} aria-label="Remove FAQ" onClick={() => setItems((x) => x.filter((_, j) => j !== i))}><Trash2 size={15} /></button>
          </div>
        </div>
      ))}
      <div className="sticky bottom-4 flex flex-wrap items-center gap-3 rounded-lg border border-border bg-card p-4 shadow-sm">
        <button className={btnGhost} onClick={() => setItems([...items, { question: "", answer: "" }])}><Plus size={15} /> Add FAQ</button>
        <button className={btnPrimary} disabled={busy} onClick={save}>{busy ? "Saving…" : "Save FAQs"}</button>
        {msg && <p role={msg.ok ? "status" : "alert"} className={`text-sm ${msg.ok ? "text-green" : "text-red-700 dark:text-red-400"}`}>{msg.text}</p>}
      </div>
    </div>
  );
}
