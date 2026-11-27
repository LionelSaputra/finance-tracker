import Link from "next/link";
import { inputClass, outlineButton } from "@/components/styles";
import { MonthNav, pickMonth } from "@/components/MonthNav";
import { requireSession } from "@/lib/auth/session";
import { loadFinanceData } from "@/lib/data/load";
import { listTransactions } from "@/lib/data/transactions";
import { monthOf, todayJakarta } from "@/lib/dates";
import { getDb } from "@/lib/db";
import { formatIDR } from "@/lib/money";

const monthShort = (d: string) => new Intl.DateTimeFormat("id-ID", { month: "short", year: "numeric", timeZone: "UTC" }).format(new Date(`${d}T00:00:00Z`));
const weekday = (d: string) => new Intl.DateTimeFormat("id-ID", { weekday: "long", timeZone: "UTC" }).format(new Date(`${d}T00:00:00Z`));
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function TransaksiPage({ searchParams }: PageProps<"/transaksi">) {
  await requireSession();
  const sp = await searchParams;
  const current = monthOf(todayJakarta());
  const month = pickMonth(sp.bulan, current);
  const categoryId = Number(one(sp.kategori)) || undefined;
  const accountId = Number(one(sp.akun)) || undefined;
  const db = getDb();
  const data = loadFinanceData(db);
  const q = one(sp.q)?.trim().slice(0, 50) || undefined;
  const rows = listTransactions(db, { month, categoryId, accountId, q });
  const qs = (m: string) => `/transaksi?${new URLSearchParams({ bulan: m, ...(categoryId ? { kategori: String(categoryId) } : {}), ...(accountId ? { akun: String(accountId) } : {}) })}`;
  const filtered = categoryId || accountId;

  const byDay = new Map<string, typeof rows>();
  for (const r of rows) byDay.set(r.occurredOn, [...(byDay.get(r.occurredOn) ?? []), r]);

  return (
    <div className="mx-auto max-w-2xl space-y-4 py-3">
      <form role="search" className="flex gap-2">
        <input name="q" type="search" defaultValue={q ?? ""} placeholder="Cari catatan, kategori, akun, atau nominal" className={inputClass} aria-label="Cari transaksi" />
        <button className={outlineButton}>Cari</button>
      </form>

      {q ? (
        <p className="flex items-baseline justify-between gap-3 text-sm text-ink-2">
          <span>
            {rows.length} hasil untuk <b className="text-ink">“{q}”</b> di semua bulan{rows.length === 200 ? " (200 terbaru)" : ""}
          </span>
          <Link href={`/transaksi?bulan=${month}`} className="font-semibold text-ink underline">
            Hapus pencarian
          </Link>
        </p>
      ) : (
        <>
      <MonthNav month={month} current={current} hrefFor={qs} />

      <form className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_auto]">
        <input type="hidden" name="bulan" value={month} />
        <select name="kategori" defaultValue={categoryId ?? ""} className={inputClass} aria-label="Filter kategori">
          <option value="">Semua kategori</option>
          {data.categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select name="akun" defaultValue={accountId ?? ""} className={inputClass} aria-label="Filter akun">
          <option value="">Semua akun</option>
          {data.accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <button className={`${outlineButton} col-span-2 sm:col-span-1`}>Terapkan</button>
      </form>
      {filtered ? (
        <Link href={`/transaksi?bulan=${month}`} className="inline-block text-sm font-semibold underline">
          Hapus filter
        </Link>
      ) : null}
        </>
      )}

      {rows.length === 0 && <p className="py-6 text-ink-2">{q ? "Tidak ada transaksi yang cocok." : filtered ? "Tidak ada transaksi yang cocok dengan filter ini." : "Belum ada transaksi di bulan ini."}</p>}
      {[...byDay].map(([day, list]) => (
        <section key={day} id={`t-${day}`} className="grid scroll-mt-4 grid-cols-[3.25rem_1fr] gap-x-3 border-t-2 border-ink pt-2">
          <h2 className="leading-none">
            <span className="block font-narrow text-4xl font-bold">{Number(day.slice(8))}</span>
            <span className="text-xs capitalize text-ink-3">{q ? monthShort(day) : weekday(day)}</span>
          </h2>
          <ul className="divide-y divide-rule">
            {list.map((r) => (
              <li key={r.id}>
                <Link href={`/transaksi/${r.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:bg-rule/30">
                  <span className="min-w-0">
                    <span className="block truncate">{r.type === "transfer" ? `${r.accountName} → ${r.toAccountName}` : r.categoryName}</span>
                    <span className="block truncate text-xs text-ink-3">
                      {r.type === "transfer" ? "Transfer" : r.accountName}
                      {r.note ? ` · ${r.note}` : ""}
                    </span>
                  </span>
                  <span className={`shrink-0 font-narrow text-lg font-bold ${r.type === "income" ? "text-aman" : r.type === "transfer" ? "text-ink-3" : ""}`}>
                    {r.type === "expense" ? "−" : r.type === "income" ? "+" : ""}
                    {formatIDR(r.amount)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
