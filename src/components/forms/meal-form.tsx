"use client";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Plus, Trash2 } from "lucide-react";
import { btnDanger, btnGhost, btnPrimary, Field, inputCls, textareaCls } from "@/components/admin/ui";
import { api, ApiError } from "@/lib/admin-fetch";
import { slugify } from "@/lib/validation/meal";
import { optimizedUrl } from "@/lib/image-url";

export type MealFormValues = {
  id?: string; name: string; slug: string; description: string; ingredients: string; type: "NORMAL" | "SPECIAL"; basePrice: string; categoryId: string;
  isAvailable: boolean; isFeatured: boolean; imageUrl: string; imagePublicId: string; options: { id?: string; litres: string; price: string }[];
};
export const emptyMeal: MealFormValues = { name: "", slug: "", description: "", ingredients: "", type: "NORMAL", basePrice: "", categoryId: "", isAvailable: true, isFeatured: false, imageUrl: "", imagePublicId: "", options: [] };

export function MealForm({ initial, categories, siteUrl }: { initial: MealFormValues; categories: { id: string; name: string }[]; siteUrl: string }) {
  const router = useRouter();
  const editing = Boolean(initial.id);
  const [v, setV] = useState(initial);
  const [slugTouched, setSlugTouched] = useState(editing);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const unsaved = useRef<string[]>([]); // images uploaded in this session that are not the saved image
  const set = <K extends keyof MealFormValues>(k: K, val: MealFormValues[K]) => setV((p) => ({ ...p, [k]: val }));

  async function upload(file: File) {
    setUploading(true); setMsg(null); setErrors((e) => ({ ...e, imageUrl: "" }));
    try {
      const form = new FormData(); form.set("file", file);
      const r = await api<{ url: string; publicId: string }>("/api/admin/uploads", { form });
      if (v.imagePublicId && unsaved.current.includes(v.imagePublicId)) { api("/api/admin/uploads", { method: "DELETE", body: { publicId: v.imagePublicId } }).catch(() => {}); unsaved.current = unsaved.current.filter((x) => x !== v.imagePublicId); }
      unsaved.current.push(r.publicId);
      setV((p) => ({ ...p, imageUrl: r.url, imagePublicId: r.publicId }));
    } catch (e) { setErrors((x) => ({ ...x, imageUrl: e instanceof ApiError ? e.message : "Upload failed." })); } finally { setUploading(false); }
  }

  function removeImage() {
    if (v.imagePublicId && unsaved.current.includes(v.imagePublicId)) api("/api/admin/uploads", { method: "DELETE", body: { publicId: v.imagePublicId } }).catch(() => {});
    setV((p) => ({ ...p, imageUrl: "", imagePublicId: "" }));
  }

  const setOption = (i: number, patch: Partial<MealFormValues["options"][number]>) => setV((p) => ({ ...p, options: p.options.map((o, j) => (j === i ? { ...o, ...patch } : o)) }));
  const moveOption = (i: number, d: -1 | 1) => setV((p) => { const o = [...p.options]; [o[i], o[i + d]] = [o[i + d], o[i]]; return { ...p, options: o }; });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setMsg(null); setErrors({});
    const payload = {
      name: v.name, slug: v.slug || undefined, description: v.description, ingredients: v.ingredients || null, type: v.type,
      basePrice: v.type === "NORMAL" ? v.basePrice : null, categoryId: v.categoryId || null, isAvailable: v.isAvailable, isFeatured: v.isFeatured,
      imageUrl: v.imageUrl || null, imagePublicId: v.imagePublicId || null,
      options: v.type === "SPECIAL" ? v.options.map((o) => ({ ...(o.id ? { id: o.id } : {}), litres: o.litres, price: o.price })) : [],
    };
    try {
      if (editing) { await api(`/api/admin/meals/${initial.id}`, { method: "PUT", body: payload }); unsaved.current = []; setMsg({ ok: true, text: "Saved." }); router.refresh(); }
      else { await api("/api/admin/meals", { body: payload }); unsaved.current = []; router.push("/admin/meals"); router.refresh(); }
    } catch (err) {
      if (err instanceof ApiError) { setErrors(err.fields); setMsg({ ok: false, text: err.message }); } else setMsg({ ok: false, text: "Something went wrong." });
    } finally { setSaving(false); }
  }

  const slugPreview = `${siteUrl.replace(/\/$/, "")}/menu/${v.slug || slugify(v.name) || "meal-name"}`;

  return (
    <form onSubmit={submit} className="grid gap-6 lg:grid-cols-3" noValidate>
      <div className="space-y-5 lg:col-span-2">
        <div className="space-y-4 rounded-lg border border-border bg-card p-5">
          <Field label="Meal name" htmlFor="name" error={errors.name}>
            <input id="name" className={inputCls} value={v.name} aria-invalid={Boolean(errors.name)} maxLength={120}
              onChange={(e) => { set("name", e.target.value); if (!slugTouched) set("slug", slugify(e.target.value)); }} />
          </Field>
          <Field label="Web address (slug)" htmlFor="slug" error={errors.slug} hint={slugPreview}>
            <input id="slug" className={inputCls} value={v.slug} aria-invalid={Boolean(errors.slug)} onChange={(e) => { setSlugTouched(true); set("slug", slugify(e.target.value)); }} />
          </Field>
          <Field label="Description" htmlFor="description" error={errors.description} hint="Shown on the menu and used in search results. Describe the meal in a sentence or two.">
            <textarea id="description" className={textareaCls} value={v.description} maxLength={2000} aria-invalid={Boolean(errors.description)} onChange={(e) => set("description", e.target.value)} />
          </Field>
          <Field label="Ingredients or additional information (optional)" htmlFor="ingredients" error={errors.ingredients}>
            <textarea id="ingredients" className={textareaCls} value={v.ingredients} maxLength={2000} onChange={(e) => set("ingredients", e.target.value)} />
          </Field>
        </div>

        <div className="space-y-4 rounded-lg border border-border bg-card p-5">
          <fieldset>
            <legend className="mb-2 text-sm font-medium">Meal type</legend>
            <div className="grid gap-3 sm:grid-cols-2">
              {([["NORMAL", "Normal meal", "One price"], ["SPECIAL", "Special meal", "Priced by litre"]] as const).map(([val, label, hint]) => (
                <label key={val} className={`cursor-pointer rounded-md border p-3 text-sm ${v.type === val ? "border-green bg-green/10" : "border-border"}`}>
                  <input type="radio" name="type" className="mr-2" checked={v.type === val} onChange={() => set("type", val)} /><strong>{label}</strong><span className="ml-1 text-text-2">· {hint}</span>
                </label>
              ))}
            </div>
          </fieldset>

          {v.type === "NORMAL" ? (
            <Field label="Price" htmlFor="basePrice" error={errors.basePrice} hint="Amount in naira, for example 5000 or 5000.50">
              <input id="basePrice" inputMode="decimal" className={inputCls} value={v.basePrice} aria-invalid={Boolean(errors.basePrice)} onChange={(e) => set("basePrice", e.target.value)} />
            </Field>
          ) : (
            <div>
              <div className="mb-2 flex items-center justify-between"><p className="text-sm font-medium">Litre options and prices</p><button type="button" className={`${btnGhost} h-9`} onClick={() => set("options", [...v.options, { litres: "", price: "" }])}><Plus size={15} /> Add option</button></div>
              {typeof errors.options === "string" && errors.options && <p role="alert" className="mb-2 text-xs text-red-700 dark:text-red-400">{errors.options}</p>}
              {v.options.length === 0 && <p className="rounded-md border border-dashed border-border p-4 text-sm text-text-2">No litre options yet. Add as many sizes as you offer, each with its own price.</p>}
              <ul className="space-y-3">
                {v.options.map((o, i) => (
                  <li key={o.id ?? i} className="grid grid-cols-[1fr_1fr_auto] items-start gap-2">
                    <Field label={i === 0 ? "Litres" : ""} error={errors[`options.${i}.litres`]}><input aria-label={`Option ${i + 1} litres`} inputMode="decimal" className={inputCls} placeholder="e.g. 2" value={o.litres} aria-invalid={Boolean(errors[`options.${i}.litres`])} onChange={(e) => setOption(i, { litres: e.target.value })} /></Field>
                    <Field label={i === 0 ? "Price" : ""} error={errors[`options.${i}.price`]}><input aria-label={`Option ${i + 1} price`} inputMode="decimal" className={inputCls} placeholder="e.g. 23000" value={o.price} aria-invalid={Boolean(errors[`options.${i}.price`])} onChange={(e) => setOption(i, { price: e.target.value })} /></Field>
                    <div className={`flex gap-1 ${i === 0 ? "pt-[27px]" : ""}`}>
                      <button type="button" className={`${btnGhost} size-11 px-0`} aria-label="Move option up" disabled={i === 0} onClick={() => moveOption(i, -1)}><ArrowUp size={15} /></button>
                      <button type="button" className={`${btnGhost} size-11 px-0`} aria-label="Move option down" disabled={i === v.options.length - 1} onClick={() => moveOption(i, 1)}><ArrowDown size={15} /></button>
                      <button type="button" className={`${btnDanger} size-11 px-0`} aria-label="Remove option" onClick={() => set("options", v.options.filter((_, j) => j !== i))}><Trash2 size={15} /></button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      <div className="space-y-5">
        <div className="rounded-lg border border-border bg-card p-5">
          <p className="mb-3 text-sm font-medium">Image</p>
          {v.imageUrl ? <img src={optimizedUrl(v.imageUrl, 600)!} alt="Meal preview" className="aspect-[4/5] w-full rounded-md object-cover" /> : <div className="grid aspect-[4/5] w-full place-items-center rounded-md border border-dashed border-border text-sm text-text-2">No image yet</div>}
          {errors.imageUrl && <p role="alert" className="mt-2 text-xs text-red-700 dark:text-red-400">{errors.imageUrl}</p>}
          <div className="mt-3 flex gap-2">
            <label className={`${btnGhost} flex-1 cursor-pointer ${uploading ? "pointer-events-none opacity-60" : ""}`}>
              <ImagePlus size={16} /> {uploading ? "Uploading…" : v.imageUrl ? "Replace" : "Upload image"}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={uploading} onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
            </label>
            {v.imageUrl && <button type="button" className={btnDanger} onClick={removeImage}>Remove</button>}
          </div>
          <p className="mt-2 text-xs text-text-2">JPEG, PNG or WebP, up to 4 MB.</p>
        </div>

        <div className="space-y-3 rounded-lg border border-border bg-card p-5">
          <Field label="Category" htmlFor="category" error={errors.categoryId}>
            <select id="category" className={inputCls} value={v.categoryId} onChange={(e) => set("categoryId", e.target.value)}>
              <option value="">No category</option>{categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={v.isAvailable} onChange={(e) => set("isAvailable", e.target.checked)} /> Available to order</label>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={v.isFeatured} onChange={(e) => set("isFeatured", e.target.checked)} /> Feature on the homepage</label>
        </div>

        <div className="sticky bottom-4 space-y-2 rounded-lg border border-border bg-card p-4 shadow-sm">
          {msg && <p role={msg.ok ? "status" : "alert"} className={`text-sm ${msg.ok ? "text-green" : "text-red-700 dark:text-red-400"}`}>{msg.text}</p>}
          <button className={`${btnPrimary} w-full`} disabled={saving || uploading}>{saving ? "Saving…" : editing ? "Save changes" : "Create meal"}</button>
        </div>
      </div>
    </form>
  );
}
