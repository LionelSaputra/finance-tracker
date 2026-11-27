import { logout } from "@/app/(auth)/login/actions";
import { ActionForm, inputClass } from "@/components/ActionForm";
import { requireSession } from "@/lib/auth/session";
import { loadFinanceData } from "@/lib/data/load";
import { getDb } from "@/lib/db";
import type { Category } from "@/lib/db/schema";
import { GROUP_LABEL } from "@/lib/labels";
import { archiveCategoryAction, createCategoryAction, settingsAction, updateCategoryAction } from "./actions";

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

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Pengaturan</h1>

      <section className="rounded-xl bg-white p-3 shadow-sm">
        <h2 className="mb-2 font-medium">Dana darurat</h2>
        <ActionForm action={settingsAction} submitLabel="Simpan" className="flex flex-wrap items-center gap-2">
          <label htmlFor="emergencyMonths" className="text-sm text-slate-600">
            Target (bulan pengeluaran)
          </label>
          <input id="emergencyMonths" name="emergencyMonths" type="number" min={1} max={24} defaultValue={data.settings.emergencyMonths} className={`${inputClass} w-24`} />
        </ActionForm>
      </section>

      {(["income", "expense"] as const).map((kind) => (
        <section key={kind} className="space-y-2">
          <h2 className="font-medium">Kategori {kind === "income" ? "pemasukan" : "pengeluaran"}</h2>
          {active
            .filter((c) => c.kind === kind)
            .map((c) => (
              <details key={c.id} className="rounded-xl bg-white p-3 shadow-sm">
                <summary className="flex cursor-pointer list-none justify-between">
                  <span>{c.name}</span>
                  <span className="text-xs text-slate-500">{kind === "expense" ? (c.group ? GROUP_LABEL[c.group] : "Lainnya") : ""}</span>
                </summary>
                <div className="mt-3 space-y-3 border-t border-slate-100 pt-3">
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

      <section className="rounded-xl bg-white p-3 shadow-sm">
        <h2 className="mb-2 font-medium">Tambah kategori</h2>
        <ActionForm action={createCategoryAction} submitLabel="Tambah">
          <input name="name" placeholder="Nama kategori" required maxLength={50} className={inputClass} aria-label="Nama kategori" />
          <select name="kind" defaultValue="expense" className={inputClass} aria-label="Jenis kategori">
            <option value="expense">Pengeluaran</option>
            <option value="income">Pemasukan</option>
          </select>
          <GroupSelect value="needs" />
          <p className="text-xs text-slate-500">Kelompok hanya dipakai untuk pengeluaran.</p>
        </ActionForm>
      </section>

      <section className="space-y-2 rounded-xl bg-white p-3 shadow-sm">
        <h2 className="font-medium">Data & koneksi</h2>
        <p className="text-sm">
          Token API trading: <strong>{tokenSet ? "terpasang" : "belum"}</strong>
        </p>
        <a href="/export" className="inline-block rounded-lg border border-slate-300 px-3 py-2 text-sm">
          Export transaksi (CSV)
        </a>
      </section>

      <form action={logout}>
        <button className="w-full rounded-lg border border-slate-300 px-3 py-2">Keluar</button>
      </form>
    </div>
  );
}
