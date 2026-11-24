"use client";
import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { btnGhost, btnPrimary, inputCls } from "@/components/admin/ui";
import { api, ApiError } from "@/lib/admin-fetch";

export function CopyButton({ value, label }: { value: string; label: string }) {
  const [done, setDone] = useState(false);
  return <button type="button" className={`${btnGhost} h-9`} aria-label={label} onClick={async () => { try { await navigator.clipboard.writeText(value); setDone(true); setTimeout(() => setDone(false), 1500); } catch {} }}>{done ? <Check size={15} /> : <Copy size={15} />}{done ? "Copied" : "Copy"}</button>;
}

export function TestEmail({ defaultTo }: { defaultTo: string }) {
  const [to, setTo] = useState(defaultTo);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  return (
    <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); setBusy(true); setMsg(null); try { await api("/api/admin/settings/email-test", { body: { to } }); setMsg({ ok: true, text: `Test email sent to ${to}. Check the inbox (and spam).` }); } catch (x) { setMsg({ ok: false, text: x instanceof ApiError ? x.message : "Something went wrong." }); } finally { setBusy(false); } }}>
      <div className="flex gap-2"><input type="email" required aria-label="Send test email to" className={inputCls} value={to} onChange={(e) => setTo(e.target.value)} placeholder="you@example.com" /><button className={btnPrimary} disabled={busy}>{busy ? "Sending…" : "Send test"}</button></div>
      {msg && <p role={msg.ok ? "status" : "alert"} className={`text-sm ${msg.ok ? "text-green" : "text-red-700 dark:text-red-400"}`}>{msg.text}</p>}
    </form>
  );
}
