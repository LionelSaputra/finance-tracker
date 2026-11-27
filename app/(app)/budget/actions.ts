"use server";

import { revalidatePath } from "next/cache";
import { formText, guarded, type ActionState } from "@/lib/action";
import { requireSession } from "@/lib/auth/session";
import { updateCategory } from "@/lib/data/categories";
import { loadFinanceData } from "@/lib/data/load";
import { getDb } from "@/lib/db";
import { parseBalance } from "@/lib/money";
import { DomainError } from "@/lib/validation";

export async function setBudgetAction(id: number, _prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireSession();
  return guarded(() => {
    const c = loadFinanceData(getDb()).categories.find((x) => x.id === id);
    if (!c) throw new DomainError("Kategori tidak ditemukan");
    const raw = formText(fd, "budget");
    // Empty = no budget for this category; NaN lets zod report a bad number.
    const monthlyBudget = raw ? (parseBalance(raw) ?? NaN) : null;
    updateCategory(getDb(), id, { name: c.name, kind: c.kind, group: c.group, monthlyBudget });
    revalidatePath("/budget");
  });
}
