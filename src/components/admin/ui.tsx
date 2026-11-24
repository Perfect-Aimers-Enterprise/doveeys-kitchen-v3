import Link from "next/link";
import { titleCase } from "@/utils/format";

export const inputCls = "h-11 w-full rounded-md border border-border bg-bg px-3 text-sm outline-none transition-colors placeholder:text-text-2 focus:border-green disabled:opacity-60 aria-[invalid=true]:border-red-700";
export const textareaCls = "min-h-28 w-full rounded-md border border-border bg-bg px-3 py-2.5 text-sm outline-none transition-colors placeholder:text-text-2 focus:border-green aria-[invalid=true]:border-red-700";
export const btn = "inline-flex h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition-opacity disabled:opacity-50";
export const btnPrimary = `${btn} bg-green text-white hover:opacity-90 dark:text-[#121713]`;
export const btnGhost = `${btn} border border-border text-text hover:bg-bg-2`;
export const btnDanger = `${btn} border border-red-700/40 text-red-700 hover:bg-red-700/10 dark:text-red-400`;

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0"><h1 className="text-4xl font-semibold leading-tight">{title}</h1>{subtitle && <p className="mt-1 text-sm text-text-2">{subtitle}</p>}</div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export function Card({ title, action, children, className = "" }: { title?: string; action?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-border bg-card ${className}`}>
      {title && <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5"><h2 className="text-xl font-semibold">{title}</h2>{action}</div>}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-text-2">{label}</p>
      <p className="mt-2 break-words text-2xl font-semibold tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-xs text-text-2">{hint}</p>}
    </div>
  );
}

const TONES = {
  green: "bg-green/15 text-green-deep dark:text-green", orange: "bg-orange/20 text-[#8a5410] dark:text-orange",
  gray: "bg-bg-2 text-text-2", red: "bg-red-700/15 text-red-800 dark:text-red-400",
} as const;
export const Badge = ({ tone = "gray", children }: { tone?: keyof typeof TONES; children: React.ReactNode }) => <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${TONES[tone]}`}>{children}</span>;

export const orderTone = (s: string): keyof typeof TONES => ({ DELIVERED: "green", CANCELLED: "red", PENDING_PAYMENT: "gray", PAID: "orange", OUT_FOR_DELIVERY: "orange" } as Record<string, keyof typeof TONES>)[s] ?? "green";
export const paymentTone = (s: string): keyof typeof TONES => ({ SUCCESSFUL: "green", FAILED: "red", REFUNDED: "orange", PENDING: "gray" } as Record<string, keyof typeof TONES>)[s] ?? "gray";
export const OrderBadge = ({ status }: { status: string }) => <Badge tone={orderTone(status)}>{titleCase(status)}</Badge>;
export const PaymentBadge = ({ status }: { status: string }) => <Badge tone={paymentTone(status)}>{titleCase(status)}</Badge>;

export function Empty({ title, text, action }: { title: string; text?: string; action?: React.ReactNode }) {
  return <div className="rounded-lg border border-dashed border-border px-6 py-12 text-center"><p className="font-heading text-2xl">{title}</p>{text && <p className="mx-auto mt-1 max-w-md text-sm text-text-2">{text}</p>}{action && <div className="mt-4">{action}</div>}</div>;
}

export function Field({ label, error, hint, htmlFor, children }: { label: string; error?: string; hint?: string; htmlFor?: string; children: React.ReactNode }) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium">{label}</label>
      {children}
      {error ? <p role="alert" className="mt-1 text-xs text-red-700 dark:text-red-400">{error}</p> : hint ? <p className="mt-1 text-xs text-text-2">{hint}</p> : null}
    </div>
  );
}

export function Table({ children }: { children: React.ReactNode }) {
  return <div className="overflow-x-auto rounded-lg border border-border bg-card"><table className="w-full min-w-[34rem] text-left text-sm">{children}</table></div>;
}
export const Th = ({ children, className = "" }: { children?: React.ReactNode; className?: string }) => <th className={`border-b border-border bg-bg-2 px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-text-2 ${className}`}>{children}</th>;
export const Td = ({ children, className = "" }: { children?: React.ReactNode; className?: string }) => <td className={`border-b border-border px-4 py-3 align-middle last:border-b-0 ${className}`}>{children}</td>;

export function Pagination({ page, pages, path, params }: { page: number; pages: number; path: string; params: Record<string, string | undefined> }) {
  if (pages <= 1) return null;
  const href = (n: number) => { const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v) as [string, string][]); q.set("page", String(n)); return `${path}?${q}`; };
  return (
    <nav aria-label="Pagination" className="mt-4 flex items-center justify-between text-sm">
      <span className="text-text-2">Page {page} of {pages}</span>
      <div className="flex gap-2">
        {page > 1 && <Link className={btnGhost} href={href(page - 1)}>Previous</Link>}
        {page < pages && <Link className={btnGhost} href={href(page + 1)}>Next</Link>}
      </div>
    </nav>
  );
}
