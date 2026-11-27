import Link from "next/link";
import type { BudgetStatus, CategoryLine } from "@/lib/finance";
import { formatIDR } from "@/lib/money";

const FILL: Record<BudgetStatus, string> = { ok: "bg-ink", warn: "bg-mepet", over: "bg-merah" };

/** Spent against budget, with today's share of the month marked so "on pace" can be read without arithmetic. */
export function BudgetBar({ current, budget, status, todayPct }: { current: number; budget: number; status: BudgetStatus | null; todayPct?: number }) {
  const pct = budget > 0 ? Math.round((current / budget) * 100) : current > 0 ? 100 : 0;
  return (
    <div
      className="relative mt-2 h-1.5 bg-rule"
      role="meter"
      aria-valuenow={Math.min(pct, 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuetext={`${pct}% dari budget`}
    >
      <div className={`anim-grow-x h-full ${FILL[status ?? "ok"]}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      {todayPct != null && <span aria-hidden className="absolute -top-1 h-3.5 w-0.5 bg-marker" style={{ left: `${todayPct}%` }} />}
    </div>
  );
}

export function BudgetBars({ lines, month, todayPct }: { lines: CategoryLine[]; month: string; todayPct?: number }) {
  const budgeted = lines.filter((l) => l.kind === "expense" && l.budget != null);
  const loose = lines.filter((l) => l.kind === "expense" && l.budget == null && l.current > 0);
  if (!budgeted.length && !loose.length)
    return (
      <p className="text-sm text-ink-2">
        Belum ada budget.{" "}
        <Link href="/budget" className="font-semibold text-ink underline">
          Atur budget
        </Link>
      </p>
    );
  const href = (id: number) => `/transaksi?bulan=${month}&kategori=${id}`;
  return (
    <ul className="divide-y divide-rule border-y border-rule">
      {budgeted.map((l) => {
        const left = l.budget! - l.current;
        return (
          <li key={l.id}>
            <Link href={href(l.id)} className="block py-3 hover:bg-rule/30">
              <span className="flex items-baseline justify-between gap-3">
                <span className="font-medium">{l.name}</span>
                <span className={`font-narrow text-lg font-bold ${left < 0 ? "text-merah" : ""}`}>
                  {left < 0 ? `lebih ${formatIDR(-left)}` : `sisa ${formatIDR(left)}`}
                </span>
              </span>
              <BudgetBar current={l.current} budget={l.budget!} status={l.status} todayPct={todayPct} />
              <span className="mt-1 block text-xs text-ink-3">
                {formatIDR(l.current)} dari {formatIDR(l.budget!)}
              </span>
            </Link>
          </li>
        );
      })}
      {loose.map((l) => (
        <li key={l.id}>
          <Link href={href(l.id)} className="flex items-baseline justify-between gap-3 py-3 hover:bg-rule/30">
            <span className="font-medium">
              {l.name} <span className="text-sm font-normal text-ink-3">· tanpa budget</span>
            </span>
            <span className="font-narrow text-lg font-bold">{formatIDR(l.current)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
