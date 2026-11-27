import type { BudgetStatus, CategoryLine } from "@/lib/finance";
import { formatIDR } from "@/lib/money";

const COLOR: Record<BudgetStatus, string> = { ok: "bg-teal-600", warn: "bg-amber-500", over: "bg-red-600" };

export function BudgetBar({ current, budget, status }: { current: number; budget: number; status: BudgetStatus | null }) {
  const pct = budget > 0 ? Math.round((current / budget) * 100) : current > 0 ? 100 : 0;
  return (
    <div className="flex items-center gap-2" role="meter" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={`${pct}% dari budget`}>
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-200">
        <div className={`h-full ${COLOR[status ?? "ok"]}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <span className="w-10 text-right text-xs text-slate-600">{pct}%</span>
    </div>
  );
}

export function BudgetBars({ lines }: { lines: CategoryLine[] }) {
  const withBudget = lines.filter((l) => l.kind === "expense" && l.budget != null);
  if (!withBudget.length) return <p className="text-sm text-slate-600">Belum ada budget. Atur di halaman Budget.</p>;
  return (
    <ul className="space-y-3">
      {withBudget.map((l) => (
        <li key={l.id}>
          <div className="flex justify-between text-sm">
            <span>{l.name}</span>
            <span className="text-slate-600">
              {formatIDR(l.current)} / {formatIDR(l.budget!)}
            </span>
          </div>
          <BudgetBar current={l.current} budget={l.budget!} status={l.status} />
        </li>
      ))}
    </ul>
  );
}
