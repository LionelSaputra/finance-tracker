"use client";

import { useEffect, useRef, useState } from "react";
import { saveTransaction } from "@/app/(app)/transaksi/actions";
import { todayJakarta } from "@/lib/dates";
import type { Account, Category, Transaction } from "@/lib/db/schema";
import { TXN_TYPE_LABEL } from "@/lib/labels";
import { useKeepValuesAction } from "./ActionForm";
import { inputClass, primaryButton } from "./styles";
import { AmountInput } from "./AmountInput";

type Props = {
  accounts: Pick<Account, "id" | "name">[];
  categories: { expense: Pick<Category, "id" | "name">[]; income: Pick<Category, "id" | "name">[] };
  defaults: { accountId: number | null; occurredOn: string; type?: Transaction["type"]; toAccountId?: number | null };
  initial?: Transaction;
};

const TYPES: Transaction["type"][] = ["expense", "income", "transfer"];

export function TransactionForm({ accounts, categories, defaults, initial }: Props) {
  const [state, onSubmit, pending] = useKeepValuesAction(saveTransaction);
  const [type, setType] = useState<Transaction["type"]>(initial?.type ?? defaults.type ?? "expense");
  const cats = type === "transfer" ? [] : categories[type];
  const [date, setDate] = useState(initial?.occurredOn ?? defaults.occurredOn);
  const autoDate = useRef(initial ? null : defaults.occurredOn);
  const [saved, setSaved] = useState(0);
  const noteRef = useRef<HTMLInputElement>(null);

  // A home-screen app can sit open overnight: roll an untouched default date over to today when it comes back.
  useEffect(() => {
    const refresh = () => {
      const old = autoDate.current;
      const today = todayJakarta();
      if (document.visibilityState !== "visible" || old === null || old === today) return;
      autoDate.current = today;
      setDate((d) => (d === old ? today : d));
    };
    document.addEventListener("visibilitychange", refresh);
    return () => document.removeEventListener("visibilitychange", refresh);
  }, []);

  // After a save, clear only amount and note: date, type, account and category carry over to the next entry of the recap.
  const [seen, setSeen] = useState(state);
  if (state !== seen) {
    setSeen(state);
    if (state?.ok) setSaved((n) => n + 1);
  }
  useEffect(() => {
    if (state?.ok && noteRef.current) noteRef.current.value = "";
  }, [state]);

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {initial && <input type="hidden" name="id" value={initial.id} />}

      <fieldset className="grid grid-cols-3 border-[1.5px] border-ink">
        <legend className="sr-only">Tipe</legend>
        {TYPES.map((t) => (
          <label
            key={t}
            className={`cursor-pointer py-2.5 text-center text-sm font-semibold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-marker ${type === t ? "bg-ink text-paper" : "text-ink-2"}`}
          >
            <input type="radio" name="type" value={t} checked={type === t} onChange={() => setType(t)} className="sr-only" />
            {TXN_TYPE_LABEL[t]}
          </label>
        ))}
      </fieldset>

      <AmountInput key={saved} defaultValue={saved ? undefined : initial?.amount} className={`${inputClass} font-narrow text-3xl! font-bold`} />

      {type !== "transfer" && (
        <fieldset>
          <legend className="mb-2 text-sm text-ink-2">Kategori</legend>
          <div className="flex flex-wrap gap-2">
            {cats.map((c, i) => (
              <label key={c.id} className="cursor-pointer">
                <input type="radio" name="categoryId" value={c.id} defaultChecked={initial?.categoryId === c.id} required={i === 0} className="peer sr-only" />
                <span className="block rounded-full border border-ink/30 bg-sheet px-3.5 py-2 text-sm peer-checked:border-ink peer-checked:bg-ink peer-checked:text-paper peer-focus-visible:outline-2 peer-focus-visible:outline-marker">
                  {c.name}
                </span>
              </label>
            ))}
          </div>
        </fieldset>
      )}

      <div className={type === "transfer" ? "grid grid-cols-2 gap-2" : ""}>
        <label className="block text-sm text-ink-2">
          {type === "transfer" ? "Dari akun" : "Akun"}
          <select name="accountId" defaultValue={initial?.accountId ?? defaults.accountId ?? accounts[0]?.id} required className={`${inputClass} mt-1`}>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        {type === "transfer" && (
          <label className="block text-sm text-ink-2">
            Ke akun
            <select name="toAccountId" defaultValue={initial?.toAccountId ?? defaults.toAccountId ?? ""} required className={`${inputClass} mt-1`}>
              <option value="" disabled>
                Pilih akun…
              </option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <label className="block text-sm text-ink-2">
        Tanggal
        <input name="occurredOn" type="date" value={date} onChange={(e) => setDate(e.target.value)} required className={`${inputClass} mt-1`} />
      </label>
      <input ref={noteRef} name="note" defaultValue={initial?.note ?? ""} maxLength={500} placeholder="Catatan (opsional)" className={inputClass} aria-label="Catatan" />

      {/* Stays above the bottom nav so a recap of many entries never needs a scroll to save. */}
      <div className="sticky bottom-[calc(70px+env(safe-area-inset-bottom))] -mx-4 space-y-2 border-t border-rule bg-paper px-4 py-3 lg:bottom-0">
        <p aria-live="polite" className="empty:hidden text-sm">
          {state?.error ? <span className="text-merah">{state.error}</span> : state?.ok ? <span className="font-semibold text-aman">{state.ok}</span> : null}
        </p>
        <button disabled={pending} className={`${primaryButton} h-12 w-full text-base`}>
          {pending ? "Menyimpan…" : "Simpan"}
        </button>
      </div>
    </form>
  );
}
