import { asc, eq } from "drizzle-orm";
import { addMonths, monthRange } from "../dates";
import type { Db } from "../db";
import { accounts, categories, recurring, type Recurring } from "../db/schema";
import { DomainError, txnInputSchema } from "../validation";
import { createTransaction } from "./transactions";

export type RecurringInput = { type: "income" | "expense"; amount: number; accountId: number; categoryId: number; note: string | null; dayOfMonth: number };
export type RecurringRow = Recurring & { categoryName: string; accountName: string };
export type DueRecurring = RecurringRow & { pendingMonth: string };

/** The day it falls on in `month`: the 31st becomes the 30th in November. */
export const dueDate = (r: Pick<Recurring, "dayOfMonth">, month: string) => {
  const last = Number(monthRange(month).end.slice(8));
  return `${month}-${String(Math.min(r.dayOfMonth, last)).padStart(2, "0")}`;
};

export function createRecurring(db: Db, input: RecurringInput): number {
  if (!Number.isInteger(input.dayOfMonth) || input.dayOfMonth < 1 || input.dayOfMonth > 31) throw new DomainError("Tanggal harus 1 sampai 31");
  // Same rules as a real entry, so posting it later cannot fail on bad data.
  txnInputSchema.parse({ ...input, occurredOn: "2026-01-01" });
  const c = db.select().from(categories).where(eq(categories.id, input.categoryId)).get();
  if (!c || c.kind !== input.type) throw new DomainError("Kategori tidak cocok dengan tipe transaksi");
  const a = db.select().from(accounts).where(eq(accounts.id, input.accountId)).get();
  if (!a || a.archived) throw new DomainError("Akun tidak ditemukan");
  return db.insert(recurring).values({ ...input, note: input.note?.trim() || null }).returning({ id: recurring.id }).get().id;
}

export function deleteRecurring(db: Db, id: number): void {
  db.delete(recurring).where(eq(recurring.id, id)).run();
}

export function listRecurring(db: Db): RecurringRow[] {
  return db
    .select({ r: recurring, categoryName: categories.name, accountName: accounts.name })
    .from(recurring)
    .innerJoin(categories, eq(categories.id, recurring.categoryId))
    .innerJoin(accounts, eq(accounts.id, recurring.accountId))
    .orderBy(asc(recurring.dayOfMonth), asc(recurring.id))
    .all()
    .map(({ r, categoryName, accountName }) => ({ ...r, categoryName, accountName }));
}

/**
 * The oldest month not yet posted or skipped, looking back at most to last month, so an entry missed while
 * the app was closed still shows up. A new entry (never handled) starts with the current month.
 */
export function pendingMonth(r: Pick<Recurring, "handledMonth">, today: string): string {
  const month = today.slice(0, 7);
  if (!r.handledMonth) return month;
  const next = addMonths(r.handledMonth, 1);
  const earliest = addMonths(month, -1);
  return next < earliest ? earliest : next;
}

/** Entries whose pending month's day has come and that were neither posted nor skipped for that month. */
export function dueRecurring(db: Db, today: string): DueRecurring[] {
  return listRecurring(db)
    .map((r) => ({ ...r, pendingMonth: pendingMonth(r, today) }))
    .filter((r) => dueDate(r, r.pendingMonth) <= today);
}

/**
 * Posts (on its due date) or skips the entry for `month`, which must be the one on screen: a double tap, or a
 * stale page after the month was handled elsewhere, does nothing instead of handling the next month.
 */
export function handleRecurring(db: Db, id: number, month: string, today: string, action: "post" | "skip"): void {
  db.transaction((tx) => {
    const r = tx.select().from(recurring).where(eq(recurring.id, id)).get();
    if (!r) throw new DomainError("Transaksi rutin tidak ditemukan");
    if (pendingMonth(r, today) !== month || dueDate(r, month) > today) return;
    if (action === "post") {
      createTransaction(tx as unknown as Db, { type: r.type, amount: r.amount, accountId: r.accountId, categoryId: r.categoryId, note: r.note, occurredOn: dueDate(r, month) });
    }
    tx.update(recurring).set({ handledMonth: month }).where(eq(recurring.id, id)).run();
  });
}
