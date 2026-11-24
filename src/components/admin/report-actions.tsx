"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Download, Mail } from "lucide-react";
import { btnGhost, btnPrimary } from "@/components/admin/ui";
import { api, ApiError } from "@/lib/admin-fetch";

export function ReportActions({ kind, label }: { kind: "WEEKLY" | "MONTHLY"; label: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function send(force: boolean) {
    if (force && !confirm("This period may already have been emailed. Send it again?")) return;
    setBusy(true); setMsg(null);
    try {
      const r = await api<{ sent: boolean; recipients?: string[] }>("/api/admin/reports/send", { body: { kind, force } });
      setMsg(r.sent ? { ok: true, text: `Sent to ${r.recipients?.join(", ")}.` } : { ok: true, text: "Already sent for this period. Use “Send again” to resend." });
      router.refresh();
    } catch (e) { setMsg({ ok: false, text: e instanceof ApiError ? e.message : "Something went wrong." }); router.refresh(); } finally { setBusy(false); }
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-text-2">{label}</p>
      <div className="flex flex-wrap gap-2">
        <a className={btnPrimary} href={`/api/admin/reports/download?kind=${kind.toLowerCase()}`}><Download size={16} /> Download PDF</a>
        <button className={btnGhost} disabled={busy} onClick={() => send(false)}><Mail size={16} /> {busy ? "Working…" : "Email now"}</button>
        <button className={btnGhost} disabled={busy} onClick={() => send(true)}>Send again</button>
      </div>
      {msg && <p role={msg.ok ? "status" : "alert"} className={`text-sm ${msg.ok ? "text-green" : "text-red-700 dark:text-red-400"}`}>{msg.text}</p>}
    </div>
  );
}
