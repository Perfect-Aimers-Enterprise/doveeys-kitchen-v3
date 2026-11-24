# Design system

Light: background #FAF9F5, secondary #F2F0E8, forest green #245C37, deep green #173F29, orange #D99035, text #22251F, muted #77776F, border #E6E3D9. Dark: background #121713, secondary #1A211C, card #202921, green #668B61, orange #E9A34B, text #F4F1E9, muted #B1B6AD, border #303A32.
Fonts: Cormorant Garamond (headings), Manrope (body, tables, forms) via `next/font` with fallbacks. Icons: Lucide.
Tokens are CSS variables in `src/app/globals.css`; the theme is set by `data-theme` on `<html>` (saved in localStorage, applied before paint). Tailwind names: `bg-bg`, `bg-bg-2`, `bg-card`, `text-text`, `text-text-2`, `border-border`, `text-green`, `text-green-deep`, `text-orange`.
Components (`src/components/admin/ui.tsx`): PageHeader, Card, Stat, Badge, Field, Table, Pagination, Empty; buttons `btnPrimary/btnGhost/btnDanger`; inputs `inputCls`. Controls are 40-44 px high for touch. Breakpoints: Tailwind defaults (sm 640, md 768, lg 1024); sidebar from lg, drawer below; tables scroll horizontally and hide secondary columns on small screens; layouts are designed for 320 px and up.
