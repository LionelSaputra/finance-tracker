"use client";

import { useState } from "react";
import { saveTransaction } from "@/app/(app)/transaksi/actions";
import type { Account, Category, Transaction } from "@/lib/db/schema";
import { TXN_TYPE_LABEL } from "@/lib/labels";
import { inputClass, useKeepValuesAction } from "./ActionForm";
import { AmountInput } from "./AmountInput";

type Props = {
  accounts: Pick<Account, "id" | "name">[];
  categories: { expense: Pick<Category, "id" | "name">[]; income: Pick<Category, "id" | "name">[] };
  defaults: { accountId: number | null; occurredOn: string };
  initial?: Transaction;
};

const TYPES: Transaction["type"][] = ["expense", "income", "transfer"];

export function TransactionForm({ accounts, categories, defaults, initial }: Props) {
  const [state, onSubmit, pending] = useKeepValuesAction(saveTransaction);
  const [type, setType] = useState<Transaction["type"]>(initial?.type ?? "expense");
  const cats = type === "transfer" ? [] : categories[type];

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {initial && <input type="hidden" name="id" value={initial.id} />}

      <fieldset className="grid grid-cols-3 gap-1 rounded-xl bg-slate-200 p-1">
        <legend className="sr-only">Tipe</legend>
        {TYPES.map((t) => (
          <label key={t} className={`cursor-pointer rounded-lg py-2 text-center text-sm font-medium ${type === t ? "bg-white shadow-sm" : "text-slate-600"}`}>
            <input type="radio" name="type" value={t} checked={type === t} onChange={() => setType(t)} className="sr-only" />
            {TXN_TYPE_LABEL[t]}
          </label>
        ))}
      </fieldset>

      <AmountInput defaultValue={initial?.amount} className={`${inputClass} text-2xl font-semibold`} />

      {type !== "transfer" && (
        <fieldset>
          <legend className="mb-2 text-sm text-slate-600">Kategori</legend>
          <div className="flex flex-wrap gap-2">
            {cats.map((c, i) => (
              <label key={c.id} className="cursor-pointer">
                <input
                  type="radio"
                  name="categoryId"
                  value={c.id}
                  defaultChecked={initial?.categoryId === c.id}
                  required={i === 0}
                  className="peer sr-only"
                />
                <span className="block rounded-full border border-slate-300 bg-white px-3 py-1.5 text-sm peer-checked:border-teal-700 peer-checked:bg-teal-700 peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-teal-500">
                  {c.name}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <div className={type === "transfer" ? "grid grid-cols-2 gap-2" : ""}>
        <select name="accountId" defaultValue={initial?.accountId ?? defaults.accountId ?? accounts[0]?.id} required className={inputClass} aria-label={type === "transfer" ? "Dari akun" : "Akun"}>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
        {type === "transfer" && (
          <select name="toAccountId" defaultValue={initial?.toAccountId ?? ""} required className={inputClass} aria-label="Ke akun">
            <option value="" disabled>
              Ke akun…
            </option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        )}
      </div>

      <input name="occurredOn" type="date" defaultValue={initial?.occurredOn ?? defaults.occurredOn} required className={inputClass} aria-label="Tanggal" />
      <input name="note" defaultValue={initial?.note ?? ""} maxLength={500} placeholder="Catatan (opsional)" className={inputClass} aria-label="Catatan" />

      {state?.error && (
        <p role="alert" className="text-sm text-red-700">
          {state.error}
        </p>
      )}
      <button disabled={pending} className="w-full rounded-xl bg-teal-700 py-3 font-semibold text-white disabled:opacity-60">
        {pending ? "Menyimpan…" : "Simpan"}
      </button>
    </form>
  );
}
