import type { SafeToTrade } from "@/lib/finance";
import { formatIDR } from "@/lib/money";

export function SafeToTradeCard({ s }: { s: SafeToTrade }) {
  return (
    <section className="rounded-xl bg-white p-4 shadow-sm">
      <h2 className="text-sm text-slate-600">Dana aman untuk trading</h2>
      <p className="mt-1 text-2xl font-semibold text-teal-800">{formatIDR(s.amount)}</p>
      {s.reason ? (
        <p className="mt-2 text-sm text-amber-700">Belum bisa dihitung: {s.reason}. Catat pengeluaran beberapa bulan atau isi budget dulu.</p>
      ) : (
        <dl className="mt-3 space-y-1 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-600">Saldo akun harian</dt>
            <dd>{formatIDR(s.freeCash)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-600">− Sisa budget bulan ini</dt>
            <dd>{formatIDR(s.remainingBudget)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-600">− Kekurangan dana darurat</dt>
            <dd>{formatIDR(s.emergencyGap ?? 0)}</dd>
          </div>
        </dl>
      )}
    </section>
  );
}
