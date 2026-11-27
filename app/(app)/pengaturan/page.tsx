import { logout } from "@/app/(auth)/login/actions";
import { ActionForm } from "@/components/ActionForm";
import { inputClass, outlineButton } from "@/components/styles";
import { requireSession } from "@/lib/auth/session";
import { loadFinanceData } from "@/lib/data/load";
import { getDb } from "@/lib/db";
import type { Category } from "@/lib/db/schema";
import { GROUP_LABEL } from "@/lib/labels";
import { AI_MODELS, aiSettingsView } from "@/lib/ai";
import { RecurringForm } from "@/components/RecurringForm";
import { listRecurring } from "@/lib/data/recurring";
import { formatIDR } from "@/lib/money";
import { aiSettingsAction, deleteRecurringAction, archiveCategoryAction, clearAiKeyAction, createCategoryAction, settingsAction, updateCategoryAction } from "./actions";

const MODEL_LABEL: Record<(typeof AI_MODELS)[number], string> = {
  "claude-opus-5-5": "Claude Opus 5.5 — paling pintar (± Rp1.000/saran)",
  "claude-sonnet-5-5": "Claude Sonnet 5.5 — seimbang (± Rp500/saran)",
  "claude-haiku-5-5": "Claude Haiku 5.5 — paling murah (± Rp25/saran)",
};

function GroupSelect({ value }: { value?: Category["group"] }) {
  return (
    <select name="group" defaultValue={value ?? ""} className={inputClass} aria-label="Kelompok">
      <option value="needs">{GROUP_LABEL.needs}</option>
      <option value="wants">{GROUP_LABEL.wants}</option>
      <option value="">Lainnya</option>
    </select>
  );
}

export default async function PengaturanPage() {
  await requireSession();
  const data = loadFinanceData(getDb());
  const active = data.categories.filter((c) => !c.archived);
  const tokenSet = (process.env.TRADING_API_TOKEN?.length ?? 0) >= 32;
  const ai = aiSettingsView(getDb());
  const rutin = listRecurring(getDb());

  return (
    <div className="mx-auto max-w-2xl space-y-8 py-5">
      <h1 className="font-narrow text-3xl font-bold">Pengaturan</h1>

      <section className="">
        <h2 className="mb-3 border-b-2 border-ink pb-1 font-narrow text-xl font-bold">Dana darurat</h2>
        <ActionForm action={settingsAction} submitLabel="Simpan" className="flex flex-wrap items-center gap-2">
          <label htmlFor="emergencyMonths" className="text-sm text-ink-2">
            Target (bulan pengeluaran)
          </label>
          <input id="emergencyMonths" name="emergencyMonths" type="number" min={1} max={24} defaultValue={data.settings.emergencyMonths} className={`${inputClass} w-24`} />
        </ActionForm>
      </section>

      <section className="space-y-3 ">
        <h2 className="mb-3 border-b-2 border-ink pb-1 font-narrow text-xl font-bold">Saran AI (Claude)</h2>
        <p className="text-sm">
          API key:{" "}
          <strong>
            {ai.keySource ? `terpasang (…${ai.keyHint})${ai.keySource === "env" ? " dari file .env" : ""}` : "belum"}
          </strong>
        </p>
        <ActionForm action={aiSettingsAction} submitLabel="Simpan">
          <input
            name="apiKey"
            type="password"
            autoComplete="off"
            placeholder={ai.keySource ? "Kosongkan untuk tetap memakai key sekarang" : "sk-ant-..."}
            className={inputClass}
            aria-label="API key Anthropic"
          />
          <select name="model" defaultValue={ai.model} className={inputClass} aria-label="Model AI">
            {AI_MODELS.map((m) => (
              <option key={m} value={m}>
                {MODEL_LABEL[m]}
              </option>
            ))}
          </select>
          <p className="text-xs text-ink-3">
            Buat key di console.anthropic.com (butuh saldo prabayar). Key disimpan di database aplikasi ini dan tidak pernah ditampilkan lagi.
          </p>
        </ActionForm>
        {ai.keySource === "app" && (
          <ActionForm action={clearAiKeyAction} submitLabel="Hapus API key" danger confirm="Hapus API key? Tombol saran AI akan hilang.">
            <input type="hidden" name="model" value={ai.model} />
          </ActionForm>
        )}
      </section>

      <section>
        <h2 className="mb-3 border-b-2 border-ink pb-1 font-narrow text-xl font-bold">Transaksi rutin</h2>
        {rutin.length > 0 && (
          <ul className="mb-4 divide-y divide-rule border-b border-rule">
            {rutin.map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{r.note || r.categoryName}</span>
                  <span className="block truncate text-xs text-ink-3">
                    Tiap tgl {r.dayOfMonth} · {r.categoryName} · {r.accountName}
                  </span>
                </span>
                <span className={`shrink-0 font-narrow text-base font-bold ${r.type === "income" ? "text-aman" : ""}`}>
                  {r.type === "income" ? "+" : "−"}
                  {formatIDR(r.amount)}
                </span>
                <ActionForm action={deleteRecurringAction.bind(null, r.id)} submitLabel="Hapus" danger confirm={`Hapus transaksi rutin ${r.note || r.categoryName}?`} className="shrink-0" />
              </li>
            ))}
          </ul>
        )}
        <RecurringForm accounts={data.accounts.filter((a) => !a.archived)} categories={active} />
      </section>

      {(["income", "expense"] as const).map((kind) => (
        <section key={kind}>
          <h2 className="mb-3 border-b-2 border-ink pb-1 font-narrow text-xl font-bold">Kategori {kind === "income" ? "pemasukan" : "pengeluaran"}</h2>
          {active
            .filter((c) => c.kind === kind)
            .map((c) => (
              <details key={c.id} className="group border-b border-rule py-3">
                <summary className="flex cursor-pointer list-none justify-between">
                  <span>{c.name}</span>
                  <span className="text-xs text-ink-3">{kind === "expense" ? (c.group ? GROUP_LABEL[c.group] : "Lainnya") : ""}</span>
                </summary>
                <div className="mt-3 space-y-4">
                  <ActionForm action={updateCategoryAction.bind(null, c.id)} submitLabel="Simpan">
                    <input name="name" defaultValue={c.name} required maxLength={50} className={inputClass} aria-label="Nama kategori" />
                    {kind === "expense" && <GroupSelect value={c.group} />}
                  </ActionForm>
                  <ActionForm action={archiveCategoryAction.bind(null, c.id)} submitLabel="Arsipkan" danger confirm={`Arsipkan kategori ${c.name}?`} />
                </div>
              </details>
            ))}
        </section>
      ))}

      <section className="">
        <h2 className="mb-3 border-b-2 border-ink pb-1 font-narrow text-xl font-bold">Tambah kategori</h2>
        <ActionForm action={createCategoryAction} submitLabel="Tambah">
          <input name="name" placeholder="Nama kategori" required maxLength={50} className={inputClass} aria-label="Nama kategori" />
          <select name="kind" defaultValue="expense" className={inputClass} aria-label="Jenis kategori">
            <option value="expense">Pengeluaran</option>
            <option value="income">Pemasukan</option>
          </select>
          <GroupSelect value="needs" />
          <p className="text-xs text-ink-3">Kelompok hanya dipakai untuk pengeluaran.</p>
        </ActionForm>
      </section>

      <section className="space-y-2 ">
        <h2 className="mb-3 border-b-2 border-ink pb-1 font-narrow text-xl font-bold">Data & koneksi</h2>
        <p className="text-sm">
          Token API trading: <strong>{tokenSet ? "terpasang" : "belum"}</strong>
        </p>
        <a href="/export" className={outlineButton}>
          Export transaksi (CSV)
        </a>
      </section>

      <form action={logout}>
        <button className={`${outlineButton} w-full`}>Keluar</button>
      </form>
    </div>
  );
}
