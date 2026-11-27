import { and, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { monthRange } from "../dates";
import type { Db } from "../db";
import { accounts, categories, transactions, type Transaction } from "../db/schema";
import { DomainError, txnInputSchema, type TxnInput } from "../validation";

export type TransactionListRow = Transaction & { accountName: string; toAccountName: string | null; categoryName: string | null };

/** Parses input and enforces the cross-row rules; returns the values to store. */
function validated(db: Db, input: TxnInput) {
  const t = txnInputSchema.parse(input);
  const account = (id: number) => {
    const a = db.select().from(accounts).where(eq(accounts.id, id)).get();
    if (!a) throw new DomainError("Akun tidak ditemukan");
    if (a.archived) throw new DomainError("Akun sudah diarsip");
  };
  account(t.accountId);
  if (t.type === "transfer") {
    if (t.toAccountId == null || t.toAccountId === t.accountId) throw new DomainError("Transfer butuh akun tujuan yang berbeda");
    if (t.categoryId != null) throw new DomainError("Transfer tidak memakai kategori");
    account(t.toAccountId);
  } else {
    const c = t.categoryId == null ? undefined : db.select().from(categories).where(eq(categories.id, t.categoryId)).get();
    if (!c || c.kind !== t.type) throw new DomainError("Kategori tidak cocok dengan tipe transaksi");
  }
  return {
    occurredOn: t.occurredOn,
    type: t.type,
    amount: t.amount,
    accountId: t.accountId,
    toAccountId: t.type === "transfer" ? t.toAccountId! : null,
    categoryId: t.type === "transfer" ? null : t.categoryId!,
    note: t.note?.trim() || null,
    externalId: t.externalId ?? null,
  };
}

export function createTransaction(db: Db, input: TxnInput, source: "manual" | "trading" = "manual"): { id: number; duplicate: boolean } {
  return db.transaction((tx) => {
    const values = validated(tx as unknown as Db, input);
    if (values.externalId) {
      const existing = tx.select({ id: transactions.id }).from(transactions).where(eq(transactions.externalId, values.externalId)).get();
      if (existing) return { id: existing.id, duplicate: true };
    }
    const { id } = tx.insert(transactions).values({ ...values, source }).returning({ id: transactions.id }).get();
    return { id, duplicate: false };
  });
}

/** Archived accounts hold exactly 0; changing their old rows would leave a balance no total shows. */
function assertEditable(db: Db, id: number) {
  const t = db.select().from(transactions).where(eq(transactions.id, id)).get();
  if (!t) throw new DomainError("Transaksi tidak ditemukan");
  const ids = [t.accountId, t.toAccountId].filter((x): x is number => x != null);
  if (db.select().from(accounts).where(inArray(accounts.id, ids)).all().some((a) => a.archived)) throw new DomainError("Akun sudah diarsip");
}

export function updateTransaction(db: Db, id: number, input: TxnInput): void {
  db.transaction((tx) => {
    assertEditable(tx as unknown as Db, id);
    const { externalId: _keep, ...values } = validated(tx as unknown as Db, input);
    tx.update(transactions).set({ ...values, updatedAt: sql`CURRENT_TIMESTAMP` }).where(eq(transactions.id, id)).run();
  });
}

export function deleteTransaction(db: Db, id: number): void {
  db.transaction((tx) => {
    assertEditable(tx as unknown as Db, id);
    tx.delete(transactions).where(eq(transactions.id, id)).run();
  });
}

export function listTransactions(db: Db, f: { month: string; categoryId?: number; accountId?: number }): TransactionListRow[] {
  const { start, end } = monthRange(f.month);
  const accName = new Map(db.select({ id: accounts.id, name: accounts.name }).from(accounts).all().map((a) => [a.id, a.name]));
  const catName = new Map(db.select({ id: categories.id, name: categories.name }).from(categories).all().map((c) => [c.id, c.name]));
  return db
    .select()
    .from(transactions)
    .where(
      and(
        gte(transactions.occurredOn, start),
        lte(transactions.occurredOn, end),
        f.categoryId ? eq(transactions.categoryId, f.categoryId) : undefined,
        f.accountId ? sql`(${transactions.accountId} = ${f.accountId} OR ${transactions.toAccountId} = ${f.accountId})` : undefined,
      ),
    )
    .orderBy(desc(transactions.occurredOn), desc(transactions.id))
    .all()
    .map((t) => ({
      ...t,
      accountName: accName.get(t.accountId) ?? "?",
      toAccountName: t.toAccountId == null ? null : (accName.get(t.toAccountId) ?? "?"),
      categoryName: t.categoryId == null ? null : (catName.get(t.categoryId) ?? "?"),
    }));
}

export function lastUsedAccountId(db: Db): number | null {
  return db.select({ id: transactions.accountId }).from(transactions).orderBy(desc(transactions.id)).limit(1).get()?.id ?? null;
}
