import Link from "next/link";
import { addMonths } from "@/lib/dates";
import { monthLabel } from "@/lib/labels";
import { Icon } from "./Icon";

/** Month switcher that never walks past the current month; hrefFor builds each link (keeps page filters). */
export function MonthNav({ month, current, hrefFor }: { month: string; current: string; hrefFor: (m: string) => string }) {
  const prev = addMonths(month, -1);
  const next = addMonths(month, 1);
  const btn = "grid h-11 w-11 place-items-center rounded-full text-ink-2 hover:bg-rule/60";
  return (
    <div className="flex items-center justify-between gap-2">
      <Link href={hrefFor(prev)} aria-label={`Ke ${monthLabel(prev)}`} className={btn}>
        <Icon name="chevron-left" />
      </Link>
      <div className="flex min-w-0 items-center gap-2">
        <h1 className="font-narrow text-xl font-bold uppercase tracking-wide">{monthLabel(month)}</h1>
        {month !== current && (
          <Link href={hrefFor(current)} className="rounded-full border border-ink px-2.5 py-1 text-xs font-semibold">
            Bulan ini
          </Link>
        )}
      </div>
      {month < current ? (
        <Link href={hrefFor(next)} aria-label={`Ke ${monthLabel(next)}`} className={btn}>
          <Icon name="chevron-right" />
        </Link>
      ) : (
        <span className="w-11" />
      )}
    </div>
  );
}

/** ?bulan= must be a real month, and never later than the current one. */
export function pickMonth(raw: string | string[] | undefined, current: string) {
  const v = Array.isArray(raw) ? raw[0] : raw;
  return v && /^\d{4}-(0[1-9]|1[0-2])$/.test(v) && v <= current ? v : current;
}
