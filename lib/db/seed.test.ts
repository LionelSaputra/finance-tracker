import { eq } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { createDb } from "./index";
import { migrateDb } from "./migrate";
import { accounts, categories, settings, transactions } from "./schema";
import { seedDefaults } from "./seed";

describe("database", () => {
  it("seeds defaults idempotently and enforces amount > 0", () => {
    const db = createDb(":memory:");
    migrateDb(db);
    seedDefaults(db);
    seedDefaults(db);
    expect(db.select().from(categories).all()).toHaveLength(15);
    expect(db.select().from(settings).get()?.emergencyMonths).toBe(6);

    const acc = db.insert(accounts).values({ name: "Dompet", kind: "spending" }).returning().get();
    const cat = db.select().from(categories).all().find((c) => c.name === "Makan")!;
    const validExpense = { occurredOn: "2026-11-27", type: "expense" as const, amount: 1, accountId: acc.id, categoryId: cat.id };
    expect(() => db.insert(transactions).values(validExpense).run()).not.toThrow();
    expect(() => db.insert(transactions).values({ ...validExpense, amount: 0 }).run()).toThrow();
  });

  it("does not bring back a renamed default category on restart", () => {
    const db = createDb(":memory:");
    migrateDb(db);
    seedDefaults(db);
    db.update(categories).set({ name: "Makanan" }).where(eq(categories.name, "Makan")).run();
    seedDefaults(db);
    const names = db.select().from(categories).all().map((c) => c.name);
    expect(names).toHaveLength(15);
    expect(names).not.toContain("Makan");
  });
});
