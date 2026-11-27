import Link from "next/link";
import { primaryButton } from "@/components/styles";
import { AiInsightCard } from "@/components/AiInsightCard";
import { BudgetBars } from "@/components/BudgetBars";
import { Icon } from "@/components/Icon";
import { MonthNav, pickMonth } from "@/components/MonthNav";
import { PaceCalendar } from "@/components/PaceCalendar";
import { SafeToTradeCard } from "@/components/SafeToTradeCard";
import { SuggestionList } from "@/components/SuggestionList";
import { aiEnabled, latestAiInsight } from "@/lib/ai";
import { requireSession } from "@/lib/auth/session";
import { loadFinanceData } from "@/lib/data/load";
import { recapStatus } from "@/lib/data/transactions";
import { addMonths, monthOf, todayJakarta } from "@/lib/dates";
import { getDb } from "@/lib/db";
import { computeSnapshot, type PaceStatus } from "@/lib/finance";
import { dateLabel, monthLabel, timeWIB } from "@/lib/labels";
import { formatIDR } from "@/lib/money";
import { ruleSuggestions } from "@/lib/suggestions";

const VERDICT: Record<PaceStatus, { word: string; tone: string; meaning: string }> = {
  aman: { word: "Aman", tone: "text-aman", meaning: "Belanja bulan ini masih sesuai jatah." },
  mepet: { word: "Mepet", tone: "text-mepet", meaning: "Belanja lebih cepat dari jalannya bulan. Rem sedikit." },
  lewat: { word: "Lewat", tone: "text-merah", meaning: "Jatah belanja bulan ini sudah habis." },
};
const shortMonth = (m: string) => new Intl.DateTimeFormat("id-ID", { month: "short", timeZone: "UTC" }).format(new Date(`${m}-01T00:00:00Z`));
const nowWIB = () => new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }).format(new Date());

export default async function HomePage({ searchParams }: PageProps<"/">) {
  await requireSession();
  const db = getDb();
  const data = loadFinanceData(db);
  const active = data.accounts.filter((a) => !a.archived);
  if (!active.length) {
    return (
      <section className="py-10">
        <h1 className="font-narrow text-4xl font-bold">Selamat datang</h1>
        <p className="mt-2 max-w-prose text-ink-2">Mulai dengan menambahkan rekening, e-wallet, atau dompet tunai beserta saldonya sekarang.</p>
        <Link href="/akun" className={`${primaryButton} mt-5`}>
          Tambah akun <Icon name="arrow" size={18} />
        </Link>
      </section>
    );
  }

  const today = todayJakarta();
  const current = monthOf(today);
  const month = pickMonth((await searchParams).bulan, current);
  const isCurrent = month === current;
  const snap = computeSnapshot(data, month, today);
  // The leaf is always about today, whatever month is on screen.
  const todaySnap = isCurrent ? snap : computeSnapshot(data, current, today);
  const shown = new Set(["budget", "goal", "data"]);
  const suggestions = ruleSuggestions(snap).filter((s) => !shown.has(s.kind));
  const trading = active.find((a) => a.kind === "trading");
  const spending = active.find((a) => a.kind === "spending");
  const depositHref = trading ? `/transaksi/baru?tipe=transfer&ke=${trading.id}${spending ? `&dari=${spending.id}` : ""}` : null;
  const recap = recapStatus(db, today);
  const recapDay = recap && todayJakarta(new Date(`${recap.lastAt.replace(" ", "T")}Z`));
  const { pace } = snap;
  const verdict = pace.status ? VERDICT[pace.status] : null;
  const todayPct = isCurrent ? Math.round((Number(today.slice(8)) / pace.days.length) * 100) : undefined;
  const topSpending = snap.categories
    .filter((c) => c.kind === "expense" && c.current > 0)
    .sort((a, b) => b.current - a.current)
    .slice(0, 3);
  const prevLabel = isCurrent ? `${shortMonth(addMonths(month, -1))} s.d. tgl ${Number(today.slice(8))}` : shortMonth(addMonths(month, -1));

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,26rem)_minmax(0,1fr)] lg:gap-x-12">
      <div>
        <SafeToTradeCard
          s={todaySnap.safeToTrade}
          today={today}
          time={nowWIB()}
          depositHref={depositHref}
          tradingResult={trading ? todaySnap.tradingResult : null}
        />

        <div className="pt-3">
          <MonthNav month={month} current={current} hrefFor={(m) => (m === current ? "/" : `/?bulan=${m}`)} />
        </div>

        <section aria-label="Status bulan" className="pb-3 pt-1">
          {verdict ? (
            <>
              <p className="flex flex-wrap items-baseline gap-x-3">
                <span className={`font-narrow text-[46px] font-bold leading-none ${verdict.tone}`}>{verdict.word}</span>
                <span className="text-sm text-ink-2">{verdict.meaning}</span>
              </p>
              {isCurrent ? (
                <p className="mt-1.5 text-pretty text-[15px] text-ink-2">
                  {pace.remaining! >= 0 ? (
                    <>
                      Sisa <b className="text-ink">{formatIDR(pace.remaining!)}</b> · ≈ <b className="text-ink">{formatIDR(Math.round((pace.perDay ?? 0) / 1000) * 1000)}/hari</b> untuk {pace.daysLeft} hari <span className="whitespace-nowrap">termasuk hari ini</span>
                    </>
                  ) : (
                    <>
                      Lewat <b className="text-merah">{formatIDR(-pace.remaining!)}</b> dari jatah bulan ini
                    </>
                  )}
                </p>
              ) : (
                <p className="mt-1.5 text-pretty text-[15px] text-ink-2">
                  Terpakai <b className="text-ink">{formatIDR(pace.spent)}</b> dari jatah {formatIDR(pace.allowance!)}
                </p>
              )}
              <p className="mt-1 text-pretty text-xs text-ink-3">
                Jatah {formatIDR(pace.allowance!)} = {pace.allowanceSource === "budget" ? "total budget" : "rata-rata pengeluaran bulanan"} · Masuk {formatIDR(snap.income)} · Keluar{" "}
                {formatIDR(snap.expense)}
              </p>
            </>
          ) : (
            <>
              <p className="font-narrow text-[34px] font-bold leading-none text-ink-3">Belum bisa dinilai</p>
              <p className="mt-1.5 text-sm text-ink-2">
                Isi budget atau catat satu bulan penuh supaya laju belanja bisa dibandingkan.{" "}
                <Link href="/budget" className="font-semibold text-ink underline">
                  Atur budget
                </Link>
              </p>
            </>
          )}
        </section>

        <PaceCalendar pace={pace} today={today} />

        {isCurrent && (
          <Link href="/transaksi/baru" className="mt-4 flex items-center justify-between gap-3 border-y border-rule py-3 text-sm hover:bg-rule/30">
            <span className="text-ink-2">
              {recap ? (
                <>
                  Terakhir kamu catat <b className="text-ink">{recapDay === today ? "hari ini" : dateLabel(recapDay!)} {timeWIB(recap.lastAt)}</b> ·{" "}
                  <span className="whitespace-nowrap">{recap.todayCount} transaksi hari ini</span>
                </>
              ) : (
                "Belum ada transaksi yang kamu catat sendiri"
              )}
            </span>
            <span className="inline-flex shrink-0 items-center gap-1 font-semibold">
              Lanjut rekap <Icon name="chevron-right" size={16} />
            </span>
          </Link>
        )}
      </div>

      <div className="space-y-7 pt-6 lg:pt-4">
        <section aria-labelledby="budget-h">
          <h2 id="budget-h" className="mb-1 font-narrow text-xl font-bold">
            Budget {monthLabel(month)}
          </h2>
          <BudgetBars lines={snap.categories} month={month} todayPct={todayPct} />
        </section>

        <section aria-labelledby="saran-h">
          <h2 id="saran-h" className="font-narrow text-xl font-bold">
            Saran
          </h2>
          <SuggestionList items={suggestions} />
        </section>

        {aiEnabled(db) && <AiInsightCard month={month} monthName={monthLabel(month)} insight={latestAiInsight(db, month)} />}

        {topSpending.length > 0 && (
          <section aria-labelledby="top-h">
            <h2 id="top-h" className="mb-1 font-narrow text-xl font-bold">
              Pengeluaran terbesar
            </h2>
            <ul className="divide-y divide-rule border-y border-rule">
              {topSpending.map((c) => (
                <li key={c.id} className="flex items-baseline justify-between gap-3 py-2.5 text-sm">
                  <span>{c.name}</span>
                  <span className="text-right">
                    <b className="font-narrow text-base">{formatIDR(c.current)}</b>
                    <span className="block text-xs text-ink-3">
                      {prevLabel}: {formatIDR(c.previous)}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {snap.goals.length > 0 && (
          <section aria-labelledby="goal-h">
            <h2 id="goal-h" className="mb-1 font-narrow text-xl font-bold">
              Target tabungan
            </h2>
            <ul className="divide-y divide-rule border-y border-rule">
              {snap.goals.map((g) => (
                <li key={g.accountId} className="py-3 text-sm">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-medium">{g.name}</span>
                    <span>
                      <b className="font-narrow text-base">{formatIDR(g.balance)}</b> <span className="text-ink-3">/ {formatIDR(g.target)}</span>
                    </span>
                  </div>
                  <div className="mt-2 h-1.5 bg-rule">
                    <div className="h-full bg-aman" style={{ width: `${Math.min(Math.max(g.progressPct, 0), 100)}%` }} />
                  </div>
                  {g.neededPerMonth ? (
                    <p className="mt-1 text-xs text-ink-3">
                      Sisihkan {formatIDR(g.neededPerMonth)} per bulan sampai {dateLabel(g.targetDate!)}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
