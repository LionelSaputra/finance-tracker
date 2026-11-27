import Link from "next/link";
import { ActionForm } from "@/components/ActionForm";
import { inputClass } from "@/components/styles";
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
  const month = monthOf(today);
  const snap = computeSnapshot(data, month, today);
  const archived = new Set(data.categories.filter((c) => c.archived).map((c) => c.id));
  const lines = snap.categories.filter((l) => l.kind === "expense" && !archived.has(l.id));
  const totalBudget = lines.reduce((s, l) => s + (l.budget ?? 0), 0);
  const todayPct = Math.round((Number(today.slice(8)) / snap.pace.days.length) * 100);
  const groups = [
    { key: "needs", title: GROUP_LABEL.needs },
    { key: "wants", title: GROUP_LABEL.wants },
    { key: null, title: "Lainnya" },
  ] as const;

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-5">
      <div>
        <h1 className="font-narrow text-3xl font-bold">Budget bulanan</h1>
        <p className="mt-1 text-sm text-ink-2">
          Berlaku setiap bulan. Total <b className="text-ink">{formatIDR(totalBudget)}</b> · terpakai bulan ini <b className="text-ink">{formatIDR(snap.expense)}</b>. Kosongkan untuk
          tanpa budget. Garis biru = hari ini.
        </p>
      </div>
      {groups.map((g) => {
        const list = lines.filter((l) => l.group === g.key);
        if (!list.length) return null;
        return (
          <section key={g.title} aria-labelledby={`g-${g.title}`}>
            <h2 id={`g-${g.title}`} className="border-b-2 border-ink pb-1 font-narrow text-xl font-bold">
              {g.title}
            </h2>
            <ul className="divide-y divide-rule">
              {list.map((l) => {
                const left = l.budget == null ? null : l.budget - l.current;
                return (
                  <li key={l.id} className="py-3">
                    <div className="flex items-baseline justify-between gap-3">
                      <Link href={`/transaksi?bulan=${month}&kategori=${l.id}`} className="font-medium underline-offset-4 hover:underline">
                        {l.name}
                      </Link>
                      <span className={`font-narrow text-lg font-bold ${left != null && left < 0 ? "text-merah" : ""}`}>
                        {left == null ? (l.current > 0 ? formatIDR(l.current) : "") : left < 0 ? `lebih ${formatIDR(-left)}` : `sisa ${formatIDR(left)}`}
                      </span>
                    </div>
                    {l.budget != null && <BudgetBar current={l.current} budget={l.budget} status={l.status} todayPct={todayPct} />}
                    <ActionForm action={setBudgetAction.bind(null, l.id)} submitLabel="Simpan" quiet className="mt-2 flex flex-wrap items-center gap-2">
                      <input
                        name="budget"
                        inputMode="numeric"
                        placeholder="Tanpa budget"
                        defaultValue={l.budget != null ? plain.format(l.budget) : ""}
                        className={`${inputClass} min-w-0 flex-1`}
                        aria-label={`Budget ${l.name}`}
                      />
                    </ActionForm>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
