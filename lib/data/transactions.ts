import { and, desc, eq, gte, inArray, lte, or, sql } from "drizzle-orm";
import { parseRupiah } from "../money";
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
    // A retry of an already-recorded row is a duplicate, whatever changed since (e.g. the account got archived).
    if (input.externalId) {
      const existing = tx.select({ id: transactions.id }).from(transactions).where(eq(transactions.externalId, input.externalId)).get();
      if (existing) return { id: existing.id, duplicate: true };
    }
    const values = validated(tx as unknown as Db, input);
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

/** With `q`, searches every month (note, category, account, or an exact amount) instead of listing one month. */
export function listTransactions(db: Db, f: { month: string; categoryId?: number; accountId?: number; q?: string }): TransactionListRow[] {
  const { start, end } = monthRange(f.month);
  const accName = new Map(db.select({ id: accounts.id, name: accounts.name }).from(accounts).all().map((a) => [a.id, a.name]));
  const catName = new Map(db.select({ id: categories.id, name: categories.name }).from(categories).all().map((c) => [c.id, c.name]));
  const q = f.q?.trim().toLowerCase();
  const idsNamed = (m: Map<number, string>) => [...m].filter(([, n]) => q && n.toLowerCase().includes(q)).map(([id]) => id);
  const amount = q ? parseRupiah(q) : null;
  const search = q
    ? or(
        sql`lower(${transactions.note}) LIKE ${`%${q.replace(/[%_!]/g, "!$&")}%`} ESCAPE '!'`,
        inArray(transactions.categoryId, idsNamed(catName)),
        inArray(transactions.accountId, idsNamed(accName)),
        amount != null ? eq(transactions.amount, amount) : undefined,
      )
    : undefined;
  return db
    .select()
    .from(transactions)
    .where(
      and(
        q ? undefined : gte(transactions.occurredOn, start),
        q ? undefined : lte(transactions.occurredOn, end),
        search,
        f.categoryId ? eq(transactions.categoryId, f.categoryId) : undefined,
        f.accountId ? sql`(${transactions.accountId} = ${f.accountId} OR ${transactions.toAccountId} = ${f.accountId})` : undefined,
      ),
    )
    .orderBy(desc(transactions.occurredOn), desc(transactions.id))
    .limit(q ? 200 : -1)
    .all()
    .map((t) => ({
      ...t,
      accountName: accName.get(t.accountId) ?? "?",
      toAccountName: t.toAccountId == null ? null : (accName.get(t.toAccountId) ?? "?"),
      categoryName: t.categoryId == null ? null : (catName.get(t.categoryId) ?? "?"),
    }));
}

/** The account of the user's own latest entry; trading-app rows and archived accounts never become the default. */
export function lastUsedAccountId(db: Db): number | null {
  return (
    db
      .select({ id: transactions.accountId })
      .from(transactions)
      .innerJoin(accounts, eq(accounts.id, transactions.accountId))
      .where(and(eq(transactions.source, "manual"), eq(accounts.archived, false)))
      .orderBy(desc(transactions.id))
      .limit(1)
      .get()?.id ?? null
  );
}

/** When the owner last recorded something by hand, and how many entries they made today (WIB). createdAt is stored in UTC. */
export function recapStatus(db: Db, today: string): { lastAt: string; todayCount: number } | null {
  const manual = eq(transactions.source, "manual");
  const last = db.select({ at: transactions.createdAt }).from(transactions).where(manual).orderBy(desc(transactions.id)).limit(1).get();
  if (!last) return null;
  const { n } = db
    .select({ n: sql<number>`count(*)` })
    .from(transactions)
    .where(and(manual, sql`date(${transactions.createdAt}, '+7 hours') = ${today}`))
    .get()!;
  return { lastAt: last.at, todayCount: n };
}
