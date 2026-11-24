"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ChartLine, FileText, LayoutDashboard, LogOut, Menu, ReceiptText, Settings, UtensilsCrossed, Users, X } from "lucide-react";
import { ThemeToggle } from "@/components/shared/theme-toggle";

const NAV = [
  { href: "/admin/dashboard", label: "Overview", Icon: LayoutDashboard },
  { href: "/admin/orders", label: "Orders", Icon: ReceiptText },
  { href: "/admin/meals", label: "Meals", Icon: UtensilsCrossed },
  { href: "/admin/customers", label: "Customers", Icon: Users },
  { href: "/admin/analytics", label: "Analytics", Icon: ChartLine },
  { href: "/admin/reports", label: "Reports", Icon: FileText },
  { href: "/admin/settings", label: "Settings", Icon: Settings },
];

export function AdminShell({ brand, adminName, children }: { brand: string; adminName: string; children: React.ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);

  async function signOut() {
    await fetch("/api/admin/auth/logout", { method: "POST" });
    router.replace("/admin/login");
    router.refresh();
  }

  const nav = (
    <nav aria-label="Administrator" className="flex-1 space-y-1 px-3 py-4">
      {NAV.map(({ href, label, Icon }) => {
        const active = path === href || path.startsWith(`${href}/`);
        return (
          <Link key={href} href={href} aria-current={active ? "page" : undefined}
            className={`flex h-11 items-center gap-3 rounded-md px-3 text-sm font-medium transition-colors ${active ? "bg-green text-white dark:text-[#121713]" : "text-text-2 hover:bg-bg-2 hover:text-text"}`}>
            <Icon size={18} aria-hidden /> {label}
          </Link>
        );
      })}
    </nav>
  );

  const footer = (
    <div className="border-t border-border p-4 text-xs text-text-2">
      <p className="truncate">Signed in as <strong className="text-text">{adminName}</strong></p>
      <p className="mt-2">Developed by <a className="underline underline-offset-2" href="https://gktech.gokafood.com" target="_blank" rel="author noopener">Godsave Kawurem</a></p>
    </div>
  );

  return (
    <div className="min-h-dvh bg-bg">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-card lg:flex">
        <div className="border-b border-border px-6 py-5"><p className="font-heading text-2xl font-semibold tracking-wide text-green-deep">{brand}</p><p className="text-[11px] uppercase tracking-widest text-text-2">Administrator</p></div>
        {nav}{footer}
      </aside>

      <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b border-border bg-bg/95 px-4 backdrop-blur lg:ml-64 lg:px-8">
        <button className="grid size-10 place-items-center rounded-md border border-border lg:hidden" aria-label="Open navigation" aria-expanded={open} onClick={() => setOpen(true)}><Menu size={18} /></button>
        <p className="font-heading text-xl font-semibold text-green-deep lg:hidden">{brand}</p>
        <div className="ml-auto flex items-center gap-2">
          <ThemeToggle />
          <button onClick={signOut} className="inline-flex h-10 items-center gap-2 rounded-md border border-border px-3 text-sm text-text-2 transition-colors hover:text-text"><LogOut size={16} /><span className="hidden sm:inline">Sign out</span></button>
        </div>
      </header>

      {open && (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <button className="absolute inset-0 bg-black/40" aria-label="Close navigation" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 max-w-[85vw] flex-col bg-card shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-5 py-4"><p className="font-heading text-2xl font-semibold text-green-deep">{brand}</p><button className="grid size-10 place-items-center" aria-label="Close navigation" onClick={() => setOpen(false)}><X size={18} /></button></div>
            {nav}{footer}
          </aside>
        </div>
      )}

      <main className="px-4 py-6 lg:ml-64 lg:px-8 lg:py-8"><div className="mx-auto max-w-6xl">{children}</div></main>
    </div>
  );
}
