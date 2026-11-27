import Link from "next/link";
import type { MonthPace } from "@/lib/finance";
import { formatIDR } from "@/lib/money";

const WEEKDAYS = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];

/** The month as a wall calendar: a dot per spending day sized by amount, red where spending ran ahead of pace, today ringed. */
export function PaceCalendar({ pace, today }: { pace: MonthPace; today: string }) {
  const first = new Date(`${pace.days[0].date}T00:00:00Z`).getUTCDay(); // 0 = Sunday
  const lead = (first + 6) % 7;
  const max = Math.max(1, ...pace.days.map((d) => d.spent));
  const anyAhead = pace.days.some((d) => d.ahead);
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
        {pace.days.map((d, i) => {
          const day = Number(d.date.slice(8));
          const isToday = d.date === today;
          const future = d.date > today;
          const size = d.spent ? Math.round(6 + 10 * Math.sqrt(d.spent / max)) : 0;
          const cell = `relative flex h-12 flex-col px-1 pt-1 font-narrow text-[15px] font-medium ${d.ahead ? "text-merah" : future ? "text-ink-3" : ""}`;
          const body = (
            <>
              <span className="relative grid h-7 w-7 place-items-center">
                {day}
                {isToday && (
                  // A hand-drawn marker loop, offset and tilted; it draws itself once, like circling the date with a pen.
                  <svg aria-hidden viewBox="0 0 44 32" className="absolute -inset-x-2 -inset-y-1 h-[calc(100%+8px)] w-[calc(100%+16px)] -rotate-12 overflow-visible">
                    <path pathLength={100} className="anim-draw" d="M33 4C25 1 9 2 4 11c-4 8 4 17 18 17s21-6 19-14C40 8 34 4 26 3" fill="none" stroke="var(--color-marker)" strokeWidth={2.2} strokeLinecap="round" />
                  </svg>
                )}
              </span>
              {size > 0 && (
                <span
                  aria-hidden
                  className={`anim-stamp absolute bottom-1.5 left-1/2 -translate-x-1/2 rounded-full ${d.ahead ? "bg-merah" : "bg-ink"}`}
                  style={{ width: size, height: size, animationDelay: `${Math.min(i * 12, 360)}ms` }}
                />
              )}
            </>
          );
          return (
            <li key={d.date} className="border-t border-rule">
              {/* Only days with spending open their transactions; an empty day has nothing to show. */}
              {d.spent > 0 ? (
                <Link
                  href={`/transaksi?bulan=${d.date.slice(0, 7)}#t-${d.date}`}
                  aria-label={`${day}: belanja ${formatIDR(d.spent)}${d.ahead ? ", melewati laju" : ""}. Lihat transaksi`}
                  className={`${cell} hover:bg-rule/40`}
                >
                  {body}
                </Link>
              ) : (
                <div className={cell} aria-label={isToday ? `${day}: hari ini` : undefined}>
                  {body}
                </div>
              )}
            </li>
          );
        })}
      </ol>
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 border-t border-rule pt-2.5 text-xs text-ink-2">
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-ink" /> Ada belanja (makin besar, makin banyak)
        </li>
        {anyAhead && (
          <li className="flex items-center gap-1.5">
            <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-merah" /> Belanja terlalu cepat untuk tanggalnya
          </li>
        )}
        <li className="flex items-center gap-1.5">
          <span aria-hidden className="h-3 w-4 -rotate-12 rounded-[50%] border-2 border-marker" /> Hari ini
        </li>
        <li className="w-full text-ink-3">Ketuk tanggal yang bertitik untuk melihat transaksinya.</li>
      </ul>
    </div>
  );
}
