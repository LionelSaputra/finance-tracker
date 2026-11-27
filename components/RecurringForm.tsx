"use client";

import { useState } from "react";
import { createRecurringAction } from "@/app/(app)/pengaturan/actions";
import type { Account, Category } from "@/lib/db/schema";
import { ActionForm } from "./ActionForm";
import { AmountInput } from "./AmountInput";
import { inputClass } from "./styles";

type Props = { accounts: Pick<Account, "id" | "name">[]; categories: Pick<Category, "id" | "name" | "kind">[] };

export function RecurringForm({ accounts, categories }: Props) {
  const [type, setType] = useState<"expense" | "income">("expense");
  return (
    <ActionForm action={createRecurringAction} submitLabel="Tambah transaksi rutin" className="space-y-3">
      <fieldset className="grid grid-cols-2 border-[1.5px] border-ink">
        <legend className="sr-only">Tipe</legend>
        {(["expense", "income"] as const).map((t) => (
          <label key={t} className={`cursor-pointer py-2 text-center text-sm font-semibold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-marker ${type === t ? "bg-ink text-paper" : "text-ink-2"}`}>
            <input type="radio" name="type" value={t} checked={type === t} onChange={() => setType(t)} className="sr-only" />
            {t === "expense" ? "Keluar" : "Masuk"}
          </label>
        ))}
      </fieldset>
      <div className="grid grid-cols-[1fr_6rem] gap-2">
        <label className="block text-sm text-ink-2">
          Nominal
          <AmountInput className={`${inputClass} mt-1`} />
        </label>
        <label className="block text-sm text-ink-2">
          Tiap tanggal
          <input name="dayOfMonth" type="number" min={1} max={31} required defaultValue={1} className={`${inputClass} mt-1`} />
        </label>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <label className="block text-sm text-ink-2">
          Kategori
          <select key={type} name="categoryId" required className={`${inputClass} mt-1`}>
            {categories
              .filter((c) => c.kind === type)
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
        </label>
        <label className="block text-sm text-ink-2">
          Akun
          <select name="accountId" required className={`${inputClass} mt-1`}>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      <input name="note" maxLength={500} placeholder="Nama, mis. Netflix atau Gaji (opsional)" className={inputClass} aria-label="Catatan" />
      <p className="text-xs text-ink-3">Mulai tanggalnya tiap bulan, transaksi ini muncul di Beranda untuk dicatat sekali ketuk. Tanggal 31 jadi akhir bulan di bulan yang lebih pendek.</p>
    </ActionForm>
  );
}
