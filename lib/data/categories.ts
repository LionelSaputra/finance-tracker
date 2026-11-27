import { and, eq, gte, ne, sql } from "drizzle-orm";
import { todayJakarta } from "../dates";
import type { Db } from "../db";
import { categories, transactions, type Category } from "../db/schema";
import { categoryInputSchema, DomainError, type CategoryInput } from "../validation";

const parse = (db: Db, input: CategoryInput, exceptId?: number) => {
  const c = categoryInputSchema.parse(input);
  const clash = db
    .select({ id: categories.id })
    .from(categories)
    .where(and(eq(categories.name, c.name), eq(categories.kind, c.kind), exceptId ? ne(categories.id, exceptId) : undefined))
    .get();
  if (clash) throw new DomainError("Kategori sudah ada");
  return { ...c, group: c.group ?? null, monthlyBudget: c.monthlyBudget ?? null };
};

export function createCategory(db: Db, input: CategoryInput): number {
  return db.insert(categories).values(parse(db, input)).returning({ id: categories.id }).get().id;
}

export function updateCategory(db: Db, id: number, input: CategoryInput): void {
  const res = db.update(categories).set(parse(db, input, id)).where(eq(categories.id, id)).run();
  if (res.changes === 0) throw new DomainError("Kategori tidak ditemukan");
}

export function archiveCategory(db: Db, id: number): void {
  db.update(categories).set({ archived: true }).where(eq(categories.id, id)).run();
}

/** Active categories of one kind, most used in the last 90 days first, then by name. */
export function listCategoriesByUsage(db: Db, kind: Category["kind"], today: string = todayJakarta()): Category[] {
  const since = new Date(`${today}T00:00:00Z`);
  since.setUTCDate(since.getUTCDate() - 90);
  const counts = new Map(
    db
      .select({ id: transactions.categoryId, n: sql<number>`count(*)` })
      .from(transactions)
      .where(gte(transactions.occurredOn, since.toISOString().slice(0, 10)))
      .groupBy(transactions.categoryId)
      .all()
      .map((r) => [r.id, r.n]),
  );
  return db
    .select()
    .from(categories)
    .where(and(eq(categories.kind, kind), eq(categories.archived, false)))
    .all()
    .sort((a, b) => (counts.get(b.id) ?? 0) - (counts.get(a.id) ?? 0) || a.name.localeCompare(b.name, "id"));
}
