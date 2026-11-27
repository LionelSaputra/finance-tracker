import { ActionForm, inputClass } from "@/components/ActionForm";
import { BudgetBar } from "@/components/BudgetBars";
import { requireSession } from "@/lib/auth/session";
import { loadFinanceData } from "@/lib/data/load";
import { monthOf, todayJakarta } from "@/lib/dates";
import { getDb } from "@/lib/db";
import { computeSnapshot } from "@/lib/finance";
import { GROUP_LABEL } from "@/lib/labels";
import { formatIDR } from "@/lib/money";
import { setBudgetAction } from "./actions";

const plain = new Intl.NumberFormat("id-ID");

export default async function BudgetPage() {
  await requireSession();
  const data = loadFinanceData(getDb());
  const today = todayJakarta();
  const snap = computeSnapshot(data, monthOf(today), today);
  const archived = new Set(data.categories.filter((c) => c.archived).map((c) => c.id));
  const lines = snap.categories.filter((l) => l.kind === "expense" && !archived.has(l.id));
  const totalBudget = lines.reduce((s, l) => s + (l.budget ?? 0), 0);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Budget bulanan</h1>
      <p className="text-sm text-slate-600">
        Berlaku setiap bulan. Total budget {formatIDR(totalBudget)} · terpakai bulan ini {formatIDR(snap.expense)}. Kosongkan untuk tanpa budget.
      </p>
      <ul className="space-y-3">
        {lines.map((l) => (
          <li key={l.id} className="rounded-xl bg-white p-3 shadow-sm">
            <div className="mb-1 flex justify-between">
              <span className="font-medium">{l.name}</span>
              <span className="text-xs text-slate-500">{l.group ? GROUP_LABEL[l.group] : "Lainnya"}</span>
            </div>
            <p className="text-sm text-slate-600">Terpakai {formatIDR(l.current)}</p>
            {l.budget != null && <BudgetBar current={l.current} budget={l.budget} status={l.status} />}
            <ActionForm action={setBudgetAction.bind(null, l.id)} submitLabel="Simpan" className="mt-2 flex flex-wrap items-center gap-2">
              <input
                name="budget"
                inputMode="numeric"
                placeholder="Tanpa budget"
                defaultValue={l.budget != null ? plain.format(l.budget) : ""}
                className={`${inputClass} flex-1`}
                aria-label={`Budget ${l.name}`}
              />
            </ActionForm>
          </li>
        ))}
      </ul>
    </div>
  );
}
