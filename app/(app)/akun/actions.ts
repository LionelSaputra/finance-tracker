"use server";

import { revalidatePath } from "next/cache";
import { formText, guarded, type ActionState } from "@/lib/action";
import { requireSession } from "@/lib/auth/session";
import { adjustBalance, archiveAccount, createAccount, updateAccount } from "@/lib/data/accounts";
import { loadFinanceData } from "@/lib/data/load";
import { getDb } from "@/lib/db";
import type { Account } from "@/lib/db/schema";
import { parseBalance, parseRupiah } from "@/lib/money";
import { DomainError } from "@/lib/validation";

// NaN makes zod reject the field, so the user sees which input is wrong.
const target = (fd: FormData) => {
  const raw = formText(fd, "targetAmount");
  return raw ? (parseRupiah(raw) ?? NaN) : null;
};
const fields = (fd: FormData) => ({
  name: formText(fd, "name"),
  kind: formText(fd, "kind") as Account["kind"],
  targetAmount: target(fd),
  targetDate: formText(fd, "targetDate") || null,
});

export async function createAccountAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireSession();
  return guarded(() => {
    createAccount(getDb(), { ...fields(fd), openingBalance: parseBalance(formText(fd, "openingBalance") || "0") ?? NaN });
    revalidatePath("/akun");
  }, "Akun ditambahkan");
}

export async function updateAccountAction(id: number, _prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireSession();
  return guarded(() => {
    const acc = loadFinanceData(getDb()).accounts.find((a) => a.id === id);
    if (!acc) throw new DomainError("Akun tidak ditemukan");
    updateAccount(getDb(), id, { ...fields(fd), openingBalance: acc.openingBalance });
    revalidatePath("/akun");
  });
}

export async function adjustBalanceAction(id: number, _prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireSession();
  return guarded(() => {
    const actual = parseBalance(formText(fd, "actual"));
    if (actual == null) throw new DomainError("Saldo tidak valid");
    adjustBalance(getDb(), id, actual);
    revalidatePath("/akun");
  }, "Saldo disesuaikan");
}

export async function archiveAccountAction(id: number, _prev: ActionState, _fd: FormData): Promise<ActionState> {
  await requireSession();
  return guarded(() => {
    archiveAccount(getDb(), id);
    revalidatePath("/akun");
  }, "Akun diarsip");
}
