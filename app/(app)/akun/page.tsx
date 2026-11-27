import { ActionForm, inputClass } from "@/components/ActionForm";
import { requireSession } from "@/lib/auth/session";
import { loadFinanceData } from "@/lib/data/load";
import { todayJakarta } from "@/lib/dates";
import { getDb } from "@/lib/db";
import type { Account } from "@/lib/db/schema";
import { accountBalances } from "@/lib/finance";
import { ACCOUNT_KIND_LABEL } from "@/lib/labels";
import { formatIDR } from "@/lib/money";
import { adjustBalanceAction, archiveAccountAction, createAccountAction, updateAccountAction } from "./actions";

const KINDS = Object.keys(ACCOUNT_KIND_LABEL) as Account["kind"][];
const plain = new Intl.NumberFormat("id-ID");

function KindSelect({ value }: { value?: Account["kind"] }) {
  return (
    <select name="kind" defaultValue={value ?? "spending"} className={inputClass} aria-label="Jenis akun">
      {KINDS.map((k) => (
        <option key={k} value={k}>
          {ACCOUNT_KIND_LABEL[k]}
        </option>
      ))}
    </select>
  );
}

function TargetFields({ a }: { a?: Account }) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <input name="targetAmount" inputMode="numeric" placeholder="Target (opsional)" defaultValue={a?.targetAmount ? plain.format(a.targetAmount) : ""} className={inputClass} aria-label="Target" />
      <input name="targetDate" type="date" defaultValue={a?.targetDate ?? ""} className={inputClass} aria-label="Tanggal target" />
    </div>
  );
}

export default async function AkunPage() {
  await requireSession();
  const data = loadFinanceData(getDb());
  const balances = accountBalances(data, todayJakarta());
  const active = data.accounts.filter((a) => !a.archived);

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Akun</h1>
      {active.length === 0 && <p className="text-slate-600">Belum ada akun. Tambahkan rekening, e-wallet, atau dompet tunai di bawah, beserta saldonya sekarang.</p>}

      {KINDS.map((kind) => {
        const list = active.filter((a) => a.kind === kind);
        if (!list.length) return null;
        const total = list.reduce((s, a) => s + (balances.get(a.id) ?? 0), 0);
        return (
          <section key={kind} className="space-y-2">
            <h2 className="flex justify-between text-sm font-medium text-slate-600">
              <span>{ACCOUNT_KIND_LABEL[kind]}</span>
              <span>{formatIDR(total)}</span>
            </h2>
            {list.map((a) => {
              const balance = balances.get(a.id) ?? 0;
              return (
                <details key={a.id} className="rounded-xl bg-white p-3 shadow-sm">
                  <summary className="flex cursor-pointer list-none justify-between gap-2">
                    <span className="font-medium">{a.name}</span>
                    <span className={balance < 0 ? "text-red-700" : ""}>{formatIDR(balance)}</span>
                  </summary>
                  {a.targetAmount ? (
                    <p className="mt-1 text-sm text-slate-600">
                      Target {formatIDR(a.targetAmount)}
                      {a.targetDate ? ` · ${a.targetDate}` : ""}
                    </p>
                  ) : null}
                  <div className="mt-3 space-y-4 border-t border-slate-100 pt-3">
                    <ActionForm action={updateAccountAction.bind(null, a.id)} submitLabel="Simpan">
                      <input name="name" defaultValue={a.name} required maxLength={50} className={inputClass} aria-label="Nama akun" />
                      <KindSelect value={a.kind} />
                      <TargetFields a={a} />
                    </ActionForm>
                    <ActionForm action={adjustBalanceAction.bind(null, a.id)} submitLabel="Sesuaikan saldo">
                      <label className="block text-sm text-slate-600" htmlFor={`actual-${a.id}`}>
                        Saldo nyata sekarang
                      </label>
                      <input id={`actual-${a.id}`} name="actual" defaultValue={plain.format(balance)} required className={inputClass} />
                    </ActionForm>
                    <ActionForm action={archiveAccountAction.bind(null, a.id)} submitLabel="Arsipkan akun" danger confirm={`Arsipkan ${a.name}?`} />
                  </div>
                </details>
              );
            })}
          </section>
        );
      })}

      <section className="rounded-xl bg-white p-3 shadow-sm">
        <h2 className="mb-2 font-medium">Tambah akun</h2>
        <ActionForm action={createAccountAction} submitLabel="Tambah akun">
          <input name="name" placeholder="Nama, mis. BCA atau GoPay" required maxLength={50} className={inputClass} aria-label="Nama akun" />
          <KindSelect />
          <input name="openingBalance" placeholder="Saldo sekarang, mis. 1.500.000" className={inputClass} aria-label="Saldo sekarang" />
          <TargetFields />
          <p className="text-xs text-slate-500">Saldo sekarang = saldo sebelum transaksi pertama yang kamu catat. Kartu kredit boleh minus.</p>
        </ActionForm>
      </section>
    </div>
  );
}
