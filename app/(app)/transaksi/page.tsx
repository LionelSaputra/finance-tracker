import Link from "next/link";
import { requireSession } from "@/lib/auth/session";
import { loadFinanceData } from "@/lib/data/load";
import { listTransactions } from "@/lib/data/transactions";
import { addMonths, monthOf, todayJakarta } from "@/lib/dates";
import { getDb } from "@/lib/db";
import { formatIDR } from "@/lib/money";

const monthLabel = (m: string) => new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${m}-01T00:00:00Z`));
const dayLabel = (d: string) => new Intl.DateTimeFormat("id-ID", { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }).format(new Date(`${d}T00:00:00Z`));
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function TransaksiPage({ searchParams }: PageProps<"/transaksi">) {
  await requireSession();
  const sp = await searchParams;
  const bulan = one(sp.bulan);
  const month = bulan && /^\d{4}-(0[1-9]|1[0-2])$/.test(bulan) ? bulan : monthOf(todayJakarta());
  const categoryId = Number(one(sp.kategori)) || undefined;
  const accountId = Number(one(sp.akun)) || undefined;
  const db = getDb();
  const data = loadFinanceData(db);
  const rows = listTransactions(db, { month, categoryId, accountId });
  const qs = (m: string) => `?${new URLSearchParams({ bulan: m, ...(categoryId ? { kategori: String(categoryId) } : {}), ...(accountId ? { akun: String(accountId) } : {}) })}`;

  const byDay = new Map<string, typeof rows>();
  for (const r of rows) byDay.set(r.occurredOn, [...(byDay.get(r.occurredOn) ?? []), r]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Link href={qs(addMonths(month, -1))} aria-label="Bulan sebelumnya" className="px-2 text-xl">
          ‹
        </Link>
        <h1 className="text-lg font-semibold">{monthLabel(month)}</h1>
        <Link href={qs(addMonths(month, 1))} aria-label="Bulan berikutnya" className="px-2 text-xl">
          ›
        </Link>
      </div>

      <form className="grid grid-cols-2 gap-2">
        <input type="hidden" name="bulan" value={month} />
        <select name="kategori" defaultValue={categoryId ?? ""} className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" aria-label="Filter kategori">
          <option value="">Semua kategori</option>
          {data.categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select name="akun" defaultValue={accountId ?? ""} className="rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm" aria-label="Filter akun">
          <option value="">Semua akun</option>
          {data.accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        <button className="col-span-2 rounded-lg border border-slate-300 py-2 text-sm">Terapkan filter</button>
      </form>

      {rows.length === 0 && <p className="text-slate-600">Belum ada transaksi di bulan ini.</p>}
      {[...byDay].map(([day, list]) => (
        <section key={day}>
          <h2 className="mb-1 text-xs font-medium uppercase text-slate-500">{dayLabel(day)}</h2>
          <ul className="divide-y divide-slate-100 rounded-xl bg-white shadow-sm">
            {list.map((r) => (
              <li key={r.id}>
                <Link href={`/transaksi/${r.id}`} className="flex items-center justify-between gap-3 px-3 py-2">
                  <span className="min-w-0">
                    <span className="block truncate">{r.type === "transfer" ? `${r.accountName} → ${r.toAccountName}` : `${r.categoryName} · ${r.accountName}`}</span>
                    {r.note && <span className="block truncate text-xs text-slate-500">{r.note}</span>}
                  </span>
                  <span className={`shrink-0 font-medium ${r.type === "income" ? "text-teal-700" : r.type === "expense" ? "text-slate-900" : "text-slate-500"}`}>
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
