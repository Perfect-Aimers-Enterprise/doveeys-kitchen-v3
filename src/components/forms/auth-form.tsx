"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Field = { name: string; label: string; type?: string; autoComplete?: string; hint?: string };
type Props = {
  endpoint: string;
  fields: Field[];
  submitLabel: string;
  extra?: Record<string, string>;
  /** After success: go to this path, or (useResponseNext) to the `next` path the server returns, else show `successMessage`. Props must be serializable: this component is rendered by server pages. */
  redirectTo?: string;
  useResponseNext?: boolean;
  successMessage?: string;
};

export function AuthForm({ endpoint, fields, submitLabel, extra, redirectTo, useResponseNext, successMessage }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [done, setDone] = useState(false);

  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setPending(true); setError(null); setFieldErrors({});
    const values = Object.fromEntries(new FormData(e.currentTarget)) as Record<string, string>;
    try {
      const res = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...values, ...extra }) });
      const json = await res.json();
      if (!json.ok) { setError(json.error.message); setFieldErrors(json.error.fields ?? {}); return; }
      const to = useResponseNext ? (json.data?.next as string | undefined) ?? redirectTo ?? null : redirectTo ?? null;
      if (to) { router.replace(to); router.refresh(); } else setDone(true);
    } catch {
      setError("Could not reach the server. Check your connection and try again.");
    } finally { setPending(false); }
  }

  if (done) return <p role="status" className="text-sm leading-6 text-text-2">{successMessage}</p>;

  return (
    <form onSubmit={submit} className="space-y-5" noValidate>
      {fields.map((f) => (
        <div key={f.name}>
          <label htmlFor={f.name} className="mb-1.5 block text-sm font-medium">{f.label}</label>
          <input id={f.name} name={f.name} type={f.type ?? "text"} autoComplete={f.autoComplete} required
            aria-invalid={Boolean(fieldErrors[f.name])}
            className="h-11 w-full rounded-md border border-border bg-bg px-3 text-sm outline-none transition-colors focus:border-green aria-[invalid=true]:border-red-700" />
          {fieldErrors[f.name] ? <p className="mt-1 text-xs text-red-700 dark:text-red-400">{fieldErrors[f.name]}</p> : f.hint ? <p className="mt-1 text-xs text-text-2">{f.hint}</p> : null}
        </div>
      ))}
      {error && <p role="alert" className="text-sm text-red-700 dark:text-red-400">{error}</p>}
      <button disabled={pending} className="h-11 w-full rounded-md bg-green text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-60 dark:text-[#121713]">
        {pending ? "Please wait…" : submitLabel}
      </button>
    </form>
  );
}
