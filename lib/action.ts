import { ZodError } from "zod";
import { DomainError } from "./validation";

export type ActionState = { ok?: string; error?: string } | undefined;

const FIELD_LABEL: Record<string, string> = {
  occurredOn: "Tanggal", type: "Tipe", amount: "Nominal", accountId: "Akun", toAccountId: "Akun tujuan", categoryId: "Kategori",
  note: "Catatan", name: "Nama", kind: "Jenis", openingBalance: "Saldo awal", targetAmount: "Target", targetDate: "Tanggal target",
  group: "Kelompok", monthlyBudget: "Budget", emergencyMonths: "Bulan dana darurat",
};

/** Runs a server-action body; user-fixable errors become a message, anything else (incl. redirect) is rethrown. */
export async function guarded(fn: () => void | Promise<void>, ok = "Tersimpan"): Promise<ActionState> {
  try {
    await fn();
    return { ok };
  } catch (e) {
    if (e instanceof DomainError) return { error: e.message };
    if (e instanceof ZodError) {
      const field = String(e.issues[0]?.path[0] ?? "");
      return { error: `Periksa isian: ${FIELD_LABEL[field] ?? field}` };
    }
    throw e;
  }
}

export const formText = (fd: FormData, key: string) => String(fd.get(key) ?? "").trim();
export const formId = (fd: FormData, key: string) => {
  const v = Number(fd.get(key));
  return Number.isInteger(v) && v > 0 ? v : undefined;
};
