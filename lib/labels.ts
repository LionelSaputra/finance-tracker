import type { Account, Category, Transaction } from "./db/schema";

export const ACCOUNT_KIND_LABEL: Record<Account["kind"], string> = {
  spending: "Harian",
  savings: "Tabungan / target",
  emergency: "Dana darurat",
  trading: "Trading",
};

export const GROUP_LABEL: Record<NonNullable<Category["group"]>, string> = { needs: "Kebutuhan", wants: "Keinginan" };

export const TXN_TYPE_LABEL: Record<Transaction["type"], string> = { expense: "Keluar", income: "Masuk", transfer: "Transfer" };

const utc = (d: string) => new Date(`${d}T00:00:00Z`);
export const monthLabel = (m: string) => new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric", timeZone: "UTC" }).format(utc(`${m}-01`));
/** "30 Jun 2027" */
export const dateLabel = (d: string) => new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }).format(utc(d));
export const weekdayLabel = (d: string) => new Intl.DateTimeFormat("id-ID", { weekday: "long", timeZone: "UTC" }).format(utc(d));
/** Compact rupiah for calendar cells: 375rb, 1,2jt. */
export const shortIDR = (n: number) =>
  n >= 1_000_000 ? `${new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 }).format(n / 1_000_000)}jt` : `${Math.round(n / 1000)}rb`;
/** "19.40" in WIB from a SQLite UTC timestamp. */
export const timeWIB = (sqlTs: string) =>
  new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }).format(new Date(`${sqlTs.replace(" ", "T")}Z`));
