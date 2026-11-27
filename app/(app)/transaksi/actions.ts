"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { formId, formText, guarded, type ActionState } from "@/lib/action";
import { requireSession } from "@/lib/auth/session";
import { createTransaction, deleteTransaction, updateTransaction } from "@/lib/data/transactions";
import { getDb } from "@/lib/db";
import type { Transaction } from "@/lib/db/schema";
import { parseRupiah } from "@/lib/money";

export async function saveTransaction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireSession();
  return guarded(() => {
    const type = formText(fd, "type") as Transaction["type"];
    const input = {
      type,
      occurredOn: formText(fd, "occurredOn"),
      // NaN (e.g. "12,5") makes zod reject the amount instead of guessing what was meant.
      amount: parseRupiah(formText(fd, "amount")) ?? NaN,
      accountId: formId(fd, "accountId") ?? NaN,
      toAccountId: type === "transfer" ? formId(fd, "toAccountId") : null,
      categoryId: type === "transfer" ? null : formId(fd, "categoryId"),
      note: formText(fd, "note") || null,
    };
    const id = formId(fd, "id");
    revalidatePath("/", "layout");
    if (id) {
      updateTransaction(getDb(), id, input);
      redirect("/transaksi");
    }
    // New entries stay on the form, so an evening recap is one entry after another.
    createTransaction(getDb(), input);
  }, "Tersimpan. Lanjut catat berikutnya.");
}

export async function removeTransaction(id: number, _prev: ActionState, _fd: FormData): Promise<ActionState> {
  await requireSession();
  return guarded(() => {
    deleteTransaction(getDb(), id);
    revalidatePath("/", "layout");
    redirect("/transaksi");
  });
}
