import Link from "next/link";

export function Breadcrumbs({ items }: { items: { name: string; href?: string }[] }) {
  return (
    <nav aria-label="Breadcrumb" style={{ fontSize: 12, marginBottom: 24 }}>
      <ol style={{ display: "flex", flexWrap: "wrap", gap: 8, listStyle: "none", padding: 0, margin: 0, color: "var(--muted)" }}>
        {items.map((it, n) => (
          <li key={it.name} style={{ display: "flex", gap: 8 }}>
            {it.href ? <Link href={it.href}>{it.name}</Link> : <span aria-current="page">{it.name}</span>}
            {n < items.length - 1 && <span aria-hidden="true">/</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
