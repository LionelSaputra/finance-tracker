import { askAi } from "@/app/(app)/actions";
import type { AiInsight } from "@/lib/ai";
import { ActionForm } from "./ActionForm";

const BADGE = { tinggi: "bg-red-100 text-red-800", sedang: "bg-amber-100 text-amber-900", rendah: "bg-slate-100 text-slate-700" } as const;
const when = (sqlTs: string) =>
  new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }).format(new Date(`${sqlTs.replace(" ", "T")}Z`));

export function AiInsightCard({ month, insight }: { month: string; insight: AiInsight | null }) {
  return (
    <section className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
      <h2 className="font-medium">Saran AI</h2>
      {insight ? (
        <>
          <p className="text-sm">{insight.ringkasan}</p>
          <ul className="space-y-2">
            {insight.saran.map((s) => (
              <li key={s.judul} className="rounded-lg border border-slate-200 p-2 text-sm">
                <div className="flex items-start justify-between gap-2">
                  <span className="font-medium">{s.judul}</span>
                  <span className={`shrink-0 rounded-full px-2 text-xs ${BADGE[s.prioritas]}`}>{s.prioritas}</span>
                </div>
                <p className="mt-1 text-slate-700">{s.detail}</p>
              </li>
            ))}
          </ul>
          <p className="text-xs text-slate-500">Dibuat {when(insight.createdAt)}. Saran AI bukan nasihat keuangan profesional.</p>
        </>
      ) : (
        <p className="text-sm text-slate-600">Minta saran berdasarkan ringkasan angka bulan ini. Catatan transaksi dan nama akun tidak dikirim.</p>
      )}
      <ActionForm action={askAi.bind(null, month)} submitLabel={insight ? "Minta saran baru" : "Minta saran AI"} />
    </section>
  );
}
