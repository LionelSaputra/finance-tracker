import Link from "next/link";
import { monthLabel as monthLong, shortIDR } from "@/lib/labels";
import { formatIDR } from "@/lib/money";

const monthShort = (m: string) => new Intl.DateTimeFormat("id-ID", { month: "short", timeZone: "UTC" }).format(new Date(`${m}-01T00:00:00Z`));

/** Six months of spending as bars; the viewed month is ink, the others recede. Each bar opens that month. */
export function SpendingTrend({ months, viewed, current }: { months: { month: string; total: number }[]; viewed: string; current: string }) {
  const max = Math.max(1, ...months.map((m) => m.total));
  const peak = months.reduce((a, b) => (b.total > a.total ? b : a)).month;
  return (
    <section aria-labelledby="tren-h">
      <h2 id="tren-h" className="font-narrow text-xl font-bold">
        Pengeluaran 6 bulan
      </h2>
      <ol className="mt-2 grid h-40 grid-cols-6 items-end gap-2 border-b border-ink">
        {months.map(({ month, total }, i) => {
          const isViewed = month === viewed;
          const label = `${monthLong(month)}: ${formatIDR(total)}${month === current ? " (s.d. hari ini)" : ""}`;
          return (
            <li key={month} className="flex h-full flex-col justify-end">
              <Link href={month === current ? "/" : `/?bulan=${month}`} aria-label={label} title={label} className="group flex h-full flex-col justify-end">
                {(isViewed || month === peak) && total > 0 && (
                  <span className="mb-1 text-center text-[11px] font-semibold text-ink-2">{shortIDR(total)}</span>
                )}
                <span
                  aria-hidden
                  className={`anim-grow-y block rounded-t-[4px] transition-colors ${isViewed ? "bg-ink" : "bg-ink-3/45 group-hover:bg-ink-3"}`}
                  style={{ height: `${Math.max(total ? 3 : 0, (total / max) * 100)}%`, animationDelay: `${i * 40}ms` }}
                />
              </Link>
            </li>
          );
        })}
      </ol>
      <ol aria-hidden className="mt-1 grid grid-cols-6 gap-2 text-center text-xs text-ink-3">
        {months.map(({ month }) => (
          <li key={month} className={month === viewed ? "font-semibold text-ink" : ""}>
            {monthShort(month)}
            {month === current && <span className="block text-[10px]">s.d. kini</span>}
          </li>
        ))}
      </ol>
    </section>
  );
}
