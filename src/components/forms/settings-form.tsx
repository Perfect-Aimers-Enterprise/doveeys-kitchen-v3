"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Plus, RotateCcw, Trash2 } from "lucide-react";
import { Badge, btnGhost, btnPrimary, Field, inputCls, textareaCls } from "@/components/admin/ui";
import { api, ApiError } from "@/lib/admin-fetch";

type Hours = { day: string; open: string; close: string }[];
export type SettingField = { key: string; label: string; type: "text" | "textarea" | "money" | "select" | "switch" | "lines" | "hours" | "int"; hint?: string; placeholder?: string; options?: { value: string; label: string }[]; min?: number; max?: number };
export type SettingState = { value: unknown; overridden: boolean; defaultValue: unknown };
const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

const toUi = (t: SettingField["type"], v: unknown): unknown => (t === "lines" ? ((v as string[]) ?? []).join("\n") : t === "int" ? String(v ?? "") : t === "money" ? (v == null ? "" : String(v)) : t === "hours" ? (v as Hours) ?? [] : t === "switch" ? Boolean(v) : (v ?? ""));
const fromUi = (t: SettingField["type"], ui: unknown): unknown => {
  if (t === "lines") return String(ui).split(/[\n,]/).map((s) => s.trim()).filter(Boolean);
  if (t === "int") return Number(ui);
  if (t === "money") return String(ui).trim() === "" ? null : String(ui).trim(); // blank = no override
  if (t === "hours") return (ui as Hours).filter((h) => h.day && h.open && h.close);
  return ui;
};

export function SettingsForm({ fields, settings, submitLabel = "Save changes" }: { fields: SettingField[]; settings: Record<string, SettingState>; submitLabel?: string }) {
  const router = useRouter();
  const [ui, setUi] = useState<Record<string, unknown>>(() => Object.fromEntries(fields.map((f) => [f.key, toUi(f.type, settings[f.key].value)])));
  const [dirty, setDirty] = useState<Set<string>>(new Set());
  const [resets, setResets] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const change = (f: SettingField, val: unknown) => { setUi((p) => ({ ...p, [f.key]: val })); setDirty((d) => new Set(d).add(f.key)); setResets((r) => { const n = new Set(r); n.delete(f.key); return n; }); setMsg(null); };
  const reset = (f: SettingField) => { setUi((p) => ({ ...p, [f.key]: toUi(f.type, settings[f.key].defaultValue) })); setResets((r) => new Set(r).add(f.key)); setDirty((d) => { const n = new Set(d); n.delete(f.key); return n; }); setMsg(null); };

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setErrors({}); setMsg(null);
    const values: Record<string, unknown> = {};
    for (const f of fields) { if (resets.has(f.key)) values[f.key] = null; else if (dirty.has(f.key)) values[f.key] = fromUi(f.type, ui[f.key]); }
    if (!Object.keys(values).length) { setMsg({ ok: true, text: "Nothing to save." }); setSaving(false); return; }
    try { await api("/api/admin/settings", { method: "PUT", body: { values } }); setDirty(new Set()); setResets(new Set()); setMsg({ ok: true, text: "Saved." }); router.refresh(); }
    catch (err) { if (err instanceof ApiError) { setErrors(err.fields); setMsg({ ok: false, text: err.message }); } else setMsg({ ok: false, text: "Something went wrong." }); }
    finally { setSaving(false); }
  }

  return (
    <form onSubmit={save} className="max-w-3xl space-y-5" noValidate>
      {fields.map((f) => {
        const s = settings[f.key];
        const showReset = (s.overridden || dirty.has(f.key)) && !resets.has(f.key);
        const id = `s-${f.key}`;
        const err = errors[f.key];
        return (
          <div key={f.key} className="rounded-lg border border-border bg-card p-5">
            <div className="mb-2 flex items-center justify-between gap-3">
              <label htmlFor={id} className="text-sm font-medium">{f.label}</label>
              <div className="flex items-center gap-2">
                {!s.overridden && !dirty.has(f.key) && <Badge>Using default</Badge>}
                {showReset && <button type="button" className="inline-flex items-center gap-1 text-xs text-text-2 underline underline-offset-2" onClick={() => reset(f)}><RotateCcw size={12} /> Reset to default</button>}
              </div>
            </div>
            {f.type === "textarea" && <textarea id={id} className={textareaCls} aria-invalid={Boolean(err)} value={ui[f.key] as string} placeholder={f.placeholder} onChange={(e) => change(f, e.target.value)} />}
            {f.type === "lines" && <textarea id={id} className={textareaCls} aria-invalid={Boolean(err)} value={ui[f.key] as string} placeholder={f.placeholder ?? "one per line"} onChange={(e) => change(f, e.target.value)} />}
            {(f.type === "text" || f.type === "money" || f.type === "int") && <input id={id} className={inputCls} aria-invalid={Boolean(err)} inputMode={f.type === "text" ? undefined : "decimal"} value={ui[f.key] as string} placeholder={f.placeholder} min={f.min} max={f.max} onChange={(e) => change(f, e.target.value)} />}
            {f.type === "select" && <select id={id} className={inputCls} value={String(ui[f.key])} onChange={(e) => change(f, f.options?.some((o) => /^\d+$/.test(o.value)) ? Number(e.target.value) : e.target.value)}>{f.options?.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>}
            {f.type === "switch" && <label className="flex items-center gap-2 text-sm"><input id={id} type="checkbox" checked={ui[f.key] as boolean} onChange={(e) => change(f, e.target.checked)} /> Enabled</label>}
            {f.type === "hours" && (
              <div className="space-y-2">
                {(ui[f.key] as Hours).map((h, i) => (
                  <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2">
                    <select aria-label="Day" className={inputCls} value={h.day} onChange={(e) => change(f, (ui[f.key] as Hours).map((x, j) => (j === i ? { ...x, day: e.target.value } : x)))}>{DAYS.map((d) => <option key={d}>{d}</option>)}</select>
                    <input aria-label="Opens" type="time" className={inputCls} value={h.open} onChange={(e) => change(f, (ui[f.key] as Hours).map((x, j) => (j === i ? { ...x, open: e.target.value } : x)))} />
                    <input aria-label="Closes" type="time" className={inputCls} value={h.close} onChange={(e) => change(f, (ui[f.key] as Hours).map((x, j) => (j === i ? { ...x, close: e.target.value } : x)))} />
                    <button type="button" className={`${btnGhost} size-11 px-0`} aria-label="Remove hours" onClick={() => change(f, (ui[f.key] as Hours).filter((_, j) => j !== i))}><Trash2 size={15} /></button>
                  </div>
                ))}
                <button type="button" className={`${btnGhost} h-9`} onClick={() => change(f, [...(ui[f.key] as Hours), { day: "Monday", open: "09:00", close: "18:00" }])}><Plus size={15} /> Add hours</button>
              </div>
            )}
            {err ? <p role="alert" className="mt-1.5 text-xs text-red-700 dark:text-red-400">{err}</p> : f.hint ? <p className="mt-1.5 text-xs text-text-2">{f.hint}</p> : null}
          </div>
        );
      })}
      <div className="sticky bottom-4 flex items-center gap-3 rounded-lg border border-border bg-card p-4 shadow-sm">
        <button className={btnPrimary} disabled={saving}>{saving ? "Saving…" : submitLabel}</button>
        {msg && <p role={msg.ok ? "status" : "alert"} className={`text-sm ${msg.ok ? "text-green" : "text-red-700 dark:text-red-400"}`}>{msg.text}</p>}
      </div>
    </form>
  );
}
