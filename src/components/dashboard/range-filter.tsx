import Link from "next/link";
import { btnGhost, btnPrimary, inputCls } from "@/components/admin/ui";
import type { DateRange } from "@/utils/tz";

const PRESETS = [["7d", "7 days"], ["30d", "30 days"], ["90d", "90 days"], ["month", "This month"], ["last-month", "Last month"]] as const;

/** Server-rendered: presets are links and the custom range is a plain GET form, so it works without client JavaScript. */
export function RangeFilter({ range, path }: { range: DateRange; path: string }) {
  return (
    <div className="mb-6 flex flex-wrap items-end gap-3">
      <div className="flex flex-wrap gap-2" role="group" aria-label="Date range">
        {PRESETS.map(([k, label]) => (
          <Link key={k} href={`${path}?range=${k}`} aria-current={range.key === k ? "true" : undefined}
            className={range.key === k ? `${btnPrimary} h-9` : `${btnGhost} h-9`}>{label}</Link>
        ))}
      </div>
      <form action={path} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="range" value="custom" />
        <label className="text-xs text-text-2">From<input type="date" name="from" defaultValue={range.fromInput} className={`${inputCls} mt-1 h-9 w-40`} /></label>
        <label className="text-xs text-text-2">To<input type="date" name="to" defaultValue={range.toInput} className={`${inputCls} mt-1 h-9 w-40`} /></label>
        <button className={`${btnGhost} h-9`}>Apply</button>
      </form>
      <p className="ml-auto text-xs text-text-2">Showing: {range.label}</p>
    </div>
  );
}
