import type { Account, Category, Transaction } from "./db/schema";

export const ACCOUNT_KIND_LABEL: Record<Account["kind"], string> = {
  spending: "Harian",
  savings: "Tabungan / target",
  emergency: "Dana darurat",
  trading: "Trading",
};

export const GROUP_LABEL: Record<NonNullable<Category["group"]>, string> = { needs: "Kebutuhan", wants: "Keinginan" };

export const TXN_TYPE_LABEL: Record<Transaction["type"], string> = { expense: "Keluar", income: "Masuk", transfer: "Transfer" };
