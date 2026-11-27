import Link from "next/link";
import type { MonthPace } from "@/lib/finance";
import { shortIDR } from "@/lib/labels";
import { formatIDR } from "@/lib/money";

const WEEKDAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

/** The month as a wall calendar: a dot per spending day sized by amount, red where spending ran ahead of pace, today ringed. */
export function PaceCalendar({ pace, today }: { pace: MonthPace; today: string }) {
  const first = new Date(`${pace.days[0].date}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  const lead = (first + 6) % 7;
  const max = Math.max(1, ...pace.days.map((d) => d.spent));
  const showAllowance = pace.perDay != null && pace.status !== "lewat";
  return (
    <div>
      <ol className="grid grid-cols-7" aria-label="Belanja per hari">
        {WEEKDAYS.map((w) => (
          <li key={w} aria-hidden className="pb-1 text-center text-xs text-ink-3">
            {w}
          </li>
        ))}
        {Array.from({ length: lead }, (_, i) => (
          <li key={`x${i}`} aria-hidden className="border-t border-rule" />
        ))}
        {pace.days.map((d) => {
          const day = Number(d.date.slice(8));
          const isToday = d.date === today;
          const future = d.date > today;
          const size = d.spent ? Math.round(6 + 10 * Math.sqrt(d.spent / max)) : 0;
          const label = `${day}: ${d.spent ? `belanja ${formatIDR(d.spent)}${d.ahead ? ", melewati laju" : ""}` : future ? "belum datang" : "tanpa belanja"}`;
          return (
            <li key={d.date} className="border-t border-rule">
              <Link
                href={`/transaksi?bulan=${d.date.slice(0, 7)}#t-${d.date}`}
                aria-label={label}
                className={`relative flex h-12 flex-col px-1 pt-1 font-narrow text-[15px] font-medium hover:bg-rule/40 ${d.ahead ? "text-merah" : future ? "text-ink-3" : ""}`}
              >
                <span className="relative grid h-7 w-7 place-items-center">
                  {day}
                  {isToday && (
                    // A hand-drawn marker loop: offset and tilted, numeral left in ink.
                    <span aria-hidden className="absolute -inset-x-1.5 -inset-y-0.5 -rotate-12 rounded-[50%] border-2 border-marker [border-top-left-radius:45%_60%]" />
                  )}
                </span>
                {size > 0 && (
                  <span aria-hidden className={`absolute bottom-1.5 left-1/2 -translate-x-1/2 rounded-full ${d.ahead ? "bg-merah" : "bg-ink"}`} style={{ width: size, height: size }} />
                )}
                {future && showAllowance && (
                  <span aria-hidden className="absolute bottom-1 left-1 font-sans text-[10px] text-ink-3">
                    {shortIDR(pace.perDay!)}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
