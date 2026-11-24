const DAY_MS = 86_400_000;

type Parts = { y: number; m: number; d: number; weekday: number; h: number };

export function tzOffsetMs(date: Date, tz: string) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: tz, hourCycle: "h23", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit" }).formatToParts(date).map((p) => [p.type, p.value]));
  const asUtc = Date.UTC(+parts.year, +parts.month - 1, +parts.day, +parts.hour, +parts.minute, +parts.second);
  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

export function localParts(date: Date, tz: string): Parts {
  const local = new Date(date.getTime() + tzOffsetMs(date, tz));
  return { y: local.getUTCFullYear(), m: local.getUTCMonth(), d: local.getUTCDate(), weekday: local.getUTCDay(), h: local.getUTCHours() };
}

/** The instant at which local midnight of y-m-d occurs in `tz`. Month is 0-based; overflow days roll over. */
export function zonedMidnight(y: number, m: number, d: number, tz: string) {
  const naive = Date.UTC(y, m, d);
  const first = naive - tzOffsetMs(new Date(naive), tz);
  return new Date(naive - tzOffsetMs(new Date(first), tz));
}

export const startOfDay = (date: Date, tz: string) => { const p = localParts(date, tz); return zonedMidnight(p.y, p.m, p.d, tz); };
export const addLocalDays = (date: Date, n: number, tz: string) => { const p = localParts(date, tz); return zonedMidnight(p.y, p.m, p.d + n, tz); };
/** Monday 00:00 of the week containing `date`. */
export const startOfWeek = (date: Date, tz: string) => { const p = localParts(date, tz); return zonedMidnight(p.y, p.m, p.d - ((p.weekday + 6) % 7), tz); };
export const startOfMonth = (date: Date, tz: string) => { const p = localParts(date, tz); return zonedMidnight(p.y, p.m, 1, tz); };
export const addLocalMonths = (date: Date, n: number, tz: string) => { const p = localParts(date, tz); return zonedMidnight(p.y, p.m + n, 1, tz); };

export type RangeKey = "7d" | "30d" | "90d" | "month" | "last-month" | "custom";
export type DateRange = { key: RangeKey; from: Date; to: Date; label: string; fromInput: string; toInput: string };

const ymd = (d: Date, tz: string) => { const p = localParts(d, tz); return `${p.y}-${String(p.m + 1).padStart(2, "0")}-${String(p.d).padStart(2, "0")}`; };
const parseYmd = (s: string | undefined, tz: string) => { const m = s?.match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? zonedMidnight(+m[1], +m[2] - 1, +m[3], tz) : null; };

/** `to` is exclusive. */
export function resolveRange(params: { range?: string; from?: string; to?: string }, tz: string, now = new Date()): DateRange {
  const tomorrow = addLocalDays(now, 1, tz);
  const fromCustom = parseYmd(params.from, tz), toCustom = parseYmd(params.to, tz);
  let key = (["7d", "30d", "90d", "month", "last-month", "custom"].includes(params.range ?? "") ? params.range : "30d") as RangeKey;
  if (key === "custom" && !(fromCustom && toCustom && toCustom >= fromCustom)) key = "30d";
  let from: Date, to = tomorrow, label: string;
  switch (key) {
    case "7d": from = addLocalDays(now, -6, tz); label = "Last 7 days"; break;
    case "90d": from = addLocalDays(now, -89, tz); label = "Last 90 days"; break;
    case "month": from = startOfMonth(now, tz); label = "This month"; break;
    case "last-month": from = addLocalMonths(now, -1, tz); to = startOfMonth(now, tz); label = "Last month"; break;
    case "custom": from = fromCustom!; to = addLocalDays(toCustom!, 1, tz); label = `${params.from} to ${params.to}`; break;
    default: from = addLocalDays(now, -29, tz); label = "Last 30 days";
  }
  return { key, from, to, label, fromInput: ymd(from, tz), toInput: ymd(new Date(to.getTime() - 1), tz) };
}
