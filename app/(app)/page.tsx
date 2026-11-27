import Link from "next/link";
import { AiInsightCard } from "@/components/AiInsightCard";
import { BudgetBars } from "@/components/BudgetBars";
import { SafeToTradeCard } from "@/components/SafeToTradeCard";
import { SuggestionList } from "@/components/SuggestionList";
import { aiEnabled, latestAiInsight } from "@/lib/ai";
import { requireSession } from "@/lib/auth/session";
import { loadFinanceData } from "@/lib/data/load";
import { addMonths, monthOf, todayJakarta } from "@/lib/dates";
import { getDb } from "@/lib/db";
import { computeSnapshot } from "@/lib/finance";
import { formatIDR } from "@/lib/money";
import { ruleSuggestions } from "@/lib/suggestions";

const monthLabel = (m: string) => new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${m}-01T00:00:00Z`));

export default async function HomePage({ searchParams }: PageProps<"/">) {
  await requireSession();
  const data = loadFinanceData(getDb());
  if (!data.accounts.some((a) => !a.archived)) {
    return (
      <section className="rounded-xl bg-white p-4 shadow-sm">
        <h1 className="font-semibold">Selamat datang</h1>
        <p className="mt-1 text-sm text-slate-600">Mulai dengan menambahkan rekening, e-wallet, atau dompet tunai beserta saldonya sekarang.</p>
        <Link href="/akun" className="mt-3 inline-block rounded-lg bg-teal-700 px-3 py-2 text-sm font-medium text-white">
          Tambah akun dulu
        </Link>
      </section>
    );
  }

  const today = todayJakarta();
  const raw = (await searchParams).bulan;
  const bulan = Array.isArray(raw) ? raw[0] : raw;
  const month = bulan && /^\d{4}-(0[1-9]|1[0-2])$/.test(bulan) ? bulan : monthOf(today);
  const snap = computeSnapshot(data, month, today);
  const suggestions = ruleSuggestions(snap);
  const topSpending = snap.categories
    .filter((c) => c.kind === "expense" && c.current > 0)
    .sort((a, b) => b.current - a.current)
    .slice(0, 5);
  const hasTrading = data.accounts.some((a) => a.kind === "trading" && !a.archived);
  const isCurrent = month === monthOf(today);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <Link href={`/?bulan=${addMonths(month, -1)}`} aria-label="Bulan sebelumnya" className="px-2 text-xl">
          ‹
        </Link>
        <h1 className="font-semibold">{monthLabel(month)}</h1>
        <Link href={`/?bulan=${addMonths(month, 1)}`} aria-label="Bulan berikutnya" className="px-2 text-xl">
          ›
        </Link>
      </div>

      <section className="grid grid-cols-3 gap-2 rounded-xl bg-white p-3 text-center text-sm shadow-sm [overflow-wrap:anywhere]">
        <div>
          <p className="text-xs text-slate-600">Masuk</p>
          <p className="font-semibold text-teal-700">{formatIDR(snap.income)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-600">Keluar</p>
          <p className="font-semibold">{formatIDR(snap.expense)}</p>
        </div>
        <div>
          <p className="text-xs text-slate-600">Sisa</p>
          <p className={`font-semibold ${snap.income - snap.expense < 0 ? "text-red-700" : ""}`}>{formatIDR(snap.income - snap.expense)}</p>
        </div>
      </section>

      <SafeToTradeCard s={snap.safeToTrade} />

      <section className="space-y-2">
        <h2 className="font-medium">Saran</h2>
        <SuggestionList items={suggestions} />
      </section>

      {aiEnabled(getDb()) && <AiInsightCard month={month} insight={latestAiInsight(getDb(), month)} />}

      <section className="space-y-2">
        <h2 className="font-medium">Budget {isCurrent ? "bulan ini" : monthLabel(month)}</h2>
        <BudgetBars lines={snap.categories} />
      </section>

      {topSpending.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-medium">Pengeluaran terbesar</h2>
          <ul className="divide-y divide-slate-100 rounded-xl bg-white shadow-sm">
            {topSpending.map((c) => (
              <li key={c.id} className="flex items-start justify-between gap-3 px-3 py-2 text-sm">
                <span>{c.name}</span>
                <span className="text-right">
                  {formatIDR(c.current)}
                  <span className="block text-xs text-slate-500">
                    {isCurrent ? "bln lalu s.d. tgl ini" : "bln lalu"} {formatIDR(c.previous)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {snap.goals.length > 0 && (
        <section className="space-y-2">
          <h2 className="font-medium">Target tabungan</h2>
          <ul className="space-y-2">
            {snap.goals.map((g) => (
              <li key={g.accountId} className="rounded-xl bg-white p-3 text-sm shadow-sm">
                <div className="flex justify-between">
                  <span className="font-medium">{g.name}</span>
                  <span>
                    {formatIDR(g.balance)} / {formatIDR(g.target)}
                  </span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full bg-teal-600" style={{ width: `${Math.min(Math.max(g.progressPct, 0), 100)}%` }} />
                </div>
                {g.neededPerMonth ? <p className="mt-1 text-xs text-slate-600">Sisihkan {formatIDR(g.neededPerMonth)} per bulan sampai {g.targetDate}</p> : null}
              </li>
            ))}
          </ul>
        </section>
      )}

      {hasTrading && (
        <section className="flex justify-between rounded-xl bg-white p-3 text-sm shadow-sm">
          <span className="text-slate-600">Hasil trading {isCurrent ? "bulan ini" : monthLabel(month)}</span>
          <span className={`font-semibold ${snap.tradingResult < 0 ? "text-red-700" : "text-teal-700"}`}>{formatIDR(snap.tradingResult)}</span>
        </section>
      )}
    </div>
  );
}
