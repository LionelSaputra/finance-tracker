import Link from "next/link";
import type { SafeToTrade } from "@/lib/finance";
import { weekdayLabel } from "@/lib/labels";
import { formatIDR } from "@/lib/money";
import { outlineButton } from "./styles";
import { Icon } from "./Icon";

type Props = { s: SafeToTrade; today: string; time: string; depositHref: string | null; tradingResult: number | null };

/** Today's leaf: the brake checked before every deposit. Always about today, whatever month the page shows. */
export function SafeToTradeCard({ s, today, time, depositHref, tradingResult }: Props) {
  const shortfall = Math.max(0, s.remainingBudget + (s.emergencyGap ?? 0) - s.freeCash);
  const state = s.reason ? "unknown" : s.amount > 0 ? "aman" : "tahan";
  return (
    <section aria-labelledby="hari-ini" className="grid grid-cols-[auto_1fr] gap-x-4 border-b border-rule py-4">
      <p aria-hidden className="font-narrow text-[84px] font-bold leading-[0.85] tracking-tight">
        {Number(today.slice(8))}
      </p>
      <div className="min-w-0">
        <h2 id="hari-ini" className="text-[13px] text-ink-2">
          <span className="capitalize">{weekdayLabel(today)}</span> · hari ini, per {time}
        </h2>
        {state === "aman" && <p className="mt-1 text-[13px] font-semibold text-aman">Boleh disetor sampai</p>}
        {state === "tahan" && <p className="mt-1 text-[13px] font-semibold text-merah">Tahan dulu, belum ada dana aman</p>}
        {state === "unknown" && <p className="mt-1 text-[13px] font-semibold text-mepet">Dana aman belum bisa dihitung</p>}
        <p className={`font-narrow text-[32px] font-bold leading-tight ${state === "tahan" ? "text-merah" : ""}`}>
          {state === "unknown" ? "—" : state === "tahan" ? `kurang ${formatIDR(shortfall)}` : formatIDR(s.amount)}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2">
          {state === "unknown" ? (
            <Link href="/budget" className={outlineButton}>
              Isi budget
            </Link>
          ) : depositHref ? (
            <Link href={depositHref} className={outlineButton}>
              Catat setor <Icon name="arrow" size={18} />
            </Link>
          ) : (
            <Link href="/akun" className="text-sm font-semibold underline">
              Tambah akun trading
            </Link>
          )}
          {tradingResult != null && (
            <span className="text-[13px] text-ink-2">
              Hasil trading bulan ini <b className={tradingResult < 0 ? "text-merah" : "text-aman"}>{formatIDR(tradingResult)}</b>
            </span>
          )}
        </div>
      </div>
      <details className="col-span-2 mt-3 text-sm">
        <summary className="inline-flex cursor-pointer list-none items-center gap-1 font-semibold text-ink-2">
          Rincian hitungan <Icon name="chevron-right" size={16} />
        </summary>
        {s.reason ? (
          <p className="mt-2 text-ink-2">Catat pengeluaran satu bulan penuh atau isi budget, supaya biaya hidup bulan ini bisa disisihkan dulu.</p>
        ) : (
          <dl className="mt-2 grid grid-cols-[1fr_auto] gap-y-1 border-t border-rule pt-2">
            <dt className="text-ink-2">Saldo akun harian</dt>
            <dd>{formatIDR(s.freeCash)}</dd>
            <dt className="text-ink-2">− Cadangan belanja s.d. akhir bulan</dt>
            <dd>{formatIDR(s.remainingBudget)}</dd>
            <dt className="text-ink-2">− Kekurangan dana darurat</dt>
            <dd>{formatIDR(s.emergencyGap ?? 0)}</dd>
            <dd className="col-span-2 pt-1 text-xs text-ink-3">
              Dana darurat {formatIDR(s.emergencyCurrent)} dari target {formatIDR(s.emergencyTarget ?? 0)}. Cadangan belanja = yang lebih besar antara sisa budget dan sisa
              pengeluaran bulan biasa.
            </dd>
          </dl>
        )}
      </details>
    </section>
  );
}
