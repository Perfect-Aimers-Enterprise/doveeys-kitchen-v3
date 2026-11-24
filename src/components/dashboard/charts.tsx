"use client";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const GRID = "var(--border)", AXIS = "var(--muted)";
const PALETTE = ["var(--green)", "var(--orange)", "#7a8f6a", "#b5703a", "#4d7a5b", "#c9b27c", "#8a8a80", "#a14f3a"];
const tooltipStyle = { background: "var(--card)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12, color: "var(--text)" };
const axis = { stroke: AXIS, fontSize: 11, tickLine: false, axisLine: false } as const;

const compact = (n: number) => new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(n);
const money = (cur: string) => (n: number) => new Intl.NumberFormat("en-NG", { style: "currency", currency: cur, maximumFractionDigits: 0 }).format(n);
const shortDay = (d: string) => { const [, m, day] = d.split("-"); return `${day}/${m}`; };

function Box({ height = 260, empty, children }: { height?: number; empty: boolean; children: React.ReactNode }) {
  if (empty) return <div className="grid place-items-center rounded-md border border-dashed border-border text-sm text-text-2" style={{ height }}>No data for this period</div>;
  return <div style={{ height }}><ResponsiveContainer width="100%" height="100%">{children as React.ReactElement}</ResponsiveContainer></div>;
}

export function RevenueChart({ data, currency }: { data: { day: string; revenue: string }[]; currency: string }) {
  const rows = data.map((d) => ({ day: d.day, revenue: Number(d.revenue) }));
  return (
    <Box empty={!rows.some((r) => r.revenue > 0)}>
      <AreaChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <defs><linearGradient id="rev" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--green)" stopOpacity={0.35} /><stop offset="100%" stopColor="var(--green)" stopOpacity={0} /></linearGradient></defs>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="day" tickFormatter={shortDay} minTickGap={24} {...axis} />
        <YAxis tickFormatter={compact} width={48} {...axis} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v) => [money(currency)(Number(v)), "Revenue"]} labelFormatter={(l) => String(l)} />
        <Area type="monotone" dataKey="revenue" stroke="var(--green)" strokeWidth={2} fill="url(#rev)" />
      </AreaChart>
    </Box>
  );
}

export function OrdersChart({ data }: { data: { day: string; orders: number }[] }) {
  return (
    <Box empty={!data.some((r) => r.orders > 0)}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="day" tickFormatter={shortDay} minTickGap={24} {...axis} />
        <YAxis allowDecimals={false} width={32} {...axis} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--bg2)" }} formatter={(v) => [String(v), "Paid orders"]} />
        <Bar dataKey="orders" fill="var(--orange)" radius={[3, 3, 0, 0]} />
      </BarChart>
    </Box>
  );
}

export function MealChart({ data }: { data: { name: string; quantity: number }[] }) {
  const rows = data.slice(0, 8);
  return (
    <Box height={Math.max(220, rows.length * 38 + 20)} empty={!rows.length}>
      <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={GRID} horizontal={false} />
        <XAxis type="number" allowDecimals={false} {...axis} />
        <YAxis type="category" dataKey="name" width={110} tickFormatter={(s: string) => (s.length > 16 ? `${s.slice(0, 15)}…` : s)} {...axis} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--bg2)" }} formatter={(v) => [String(v), "Sold"]} />
        <Bar dataKey="quantity" fill="var(--green)" radius={[0, 3, 3, 0]} />
      </BarChart>
    </Box>
  );
}

export function StatusChart({ data }: { data: { status: string; count: number }[] }) {
  const rows = data.map((d) => ({ name: d.status.replace(/_/g, " ").toLowerCase().replace(/^\w/, (c) => c.toUpperCase()), value: d.count }));
  return (
    <Box empty={!rows.length}>
      <PieChart>
        <Pie data={rows} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="80%" paddingAngle={2} stroke="var(--card)">
          {rows.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} />
        <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </Box>
  );
}
