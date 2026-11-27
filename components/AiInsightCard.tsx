import { askAi } from "@/app/(app)/actions";
import type { AiInsight } from "@/lib/ai";
import { ActionForm } from "./ActionForm";

const BADGE = { tinggi: "text-merah", sedang: "text-mepet", rendah: "text-ink-3" } as const;
const when = (sqlTs: string) =>
  new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(`${sqlTs.replace(" ", "T")}Z`));

export function AiInsightCard({ month, monthName, insight }: { month: string; monthName: string; insight: AiInsight | null }) {
  return (
    <section aria-labelledby="saran-ai" className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <h2 id="saran-ai" className="font-narrow text-xl font-bold">
          Saran AI
        </h2>
        <span className="text-xs text-ink-3">≈ Rp1.000 per permintaan</span>
      </div>
      {insight ? (
        <details>
          <summary className="cursor-pointer list-none text-sm">
            {insight.ringkasan} <span className="font-semibold underline">Lihat {insight.saran.length} saran</span>
          </summary>
          <ul className="mt-2 divide-y divide-rule border-y border-rule">
            {insight.saran.map((s) => (
              <li key={s.judul} className="py-2.5 text-sm">
                <span className="font-semibold">{s.judul}</span> <span className={`text-xs font-semibold ${BADGE[s.prioritas]}`}>· prioritas {s.prioritas}</span>
                <p className="mt-0.5 text-ink-2">{s.detail}</p>
              </li>
            ))}
          </ul>
          <p className="mt-1 text-xs text-ink-3">Dibuat {when(insight.createdAt)}. Bukan nasihat keuangan profesional.</p>
        </details>
      ) : (
        <p className="text-sm text-ink-2">Yang dikirim hanya ringkasan angka {monthName}; catatan transaksi dan nama rekening tidak ikut.</p>
      )}
      <ActionForm action={askAi.bind(null, month)} submitLabel={insight ? "Minta saran baru" : "Minta saran AI"} pendingLabel="Meminta saran…" quiet />
    </section>
  );
}
