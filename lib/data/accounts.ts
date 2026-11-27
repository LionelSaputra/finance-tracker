import { eq } from "drizzle-orm";
import { todayJakarta } from "../dates";
import type { Db } from "../db";
import { accounts } from "../db/schema";
import { accountBalances } from "../finance";
import { MAX_AMOUNT } from "../money";
import { accountInputSchema, DomainError, type AccountInput } from "../validation";
import { loadFinanceData } from "./load";

const balanceOf = (db: Db, id: number, asOf?: string) => {
  const data = loadFinanceData(db);
  if (!data.accounts.some((a) => a.id === id)) throw new DomainError("Akun tidak ditemukan");
  return accountBalances(data, asOf).get(id) ?? 0;
};

export function createAccount(db: Db, input: AccountInput): number {
  const a = accountInputSchema.parse(input);
  return db.insert(accounts).values(a).returning({ id: accounts.id }).get().id;
}

export function updateAccount(db: Db, id: number, input: AccountInput): void {
  const a = accountInputSchema.parse(input);
  const res = db.update(accounts).set({ ...a, targetAmount: a.targetAmount ?? null, targetDate: a.targetDate ?? null }).where(eq(accounts.id, id)).run();
  if (res.changes === 0) throw new DomainError("Akun tidak ditemukan");
}

/** Shifts the opening balance so the computed balance equals what the user sees in their real account. */
export function adjustBalance(db: Db, id: number, actualBalance: number): void {
  if (!Number.isInteger(actualBalance) || Math.abs(actualBalance) > MAX_AMOUNT) throw new DomainError("Saldo tidak valid");
  db.transaction((tx) => {
    const delta = actualBalance - balanceOf(tx as unknown as Db, id, todayJakarta());
    const acc = tx.select().from(accounts).where(eq(accounts.id, id)).get()!;
    tx.update(accounts).set({ openingBalance: acc.openingBalance + delta }).where(eq(accounts.id, id)).run();
  });
}

export function archiveAccount(db: Db, id: number): void {
  // Zero today and zero after future-dated entries, so nothing appears in a hidden account later.
  if (balanceOf(db, id, todayJakarta()) !== 0 || balanceOf(db, id) !== 0) throw new DomainError("Saldo harus 0 sebelum akun diarsip");
  db.update(accounts).set({ archived: true }).where(eq(accounts.id, id)).run();
}
