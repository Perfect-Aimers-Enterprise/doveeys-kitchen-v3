import type { Metadata } from "next";

// Private, per-customer or transactional pages must never appear in search results.
export const metadata: Metadata = { robots: { index: false, follow: false, nocache: true } };

export default function Layout({ children }: { children: React.ReactNode }) { return children; }
