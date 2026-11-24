export const fmtDateTime = (d: Date | string | null | undefined, tz = "Africa/Lagos") =>
  d ? new Intl.DateTimeFormat("en-GB", { timeZone: tz, day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(d)) : "—";
export const fmtDate = (d: Date | string | null | undefined, tz = "Africa/Lagos") =>
  d ? new Intl.DateTimeFormat("en-GB", { timeZone: tz, day: "2-digit", month: "short", year: "numeric" }).format(new Date(d)) : "—";
export const titleCase = (s: string) => s.toLowerCase().replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
