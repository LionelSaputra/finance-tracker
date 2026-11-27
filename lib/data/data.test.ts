import { beforeEach, describe, expect, it } from "vitest";
import { todayJakarta } from "../dates";
import { createDb, type Db } from "../db";
import { migrateDb } from "../db/migrate";
import { seedDefaults } from "../db/seed";
import { accountBalances } from "../finance";
import { MAX_AMOUNT } from "../money";
import { categoryInputSchema, txnInputSchema } from "../validation";
import { adjustBalance, archiveAccount, createAccount } from "./accounts";
import { createCategory, listCategoriesByUsage } from "./categories";
import { loadFinanceData, updateSettings } from "./load";
import { createTransaction, deleteTransaction, lastUsedAccountId, listTransactions, updateTransaction } from "./transactions";

let db: Db;
let dompet: number;
let bank: number;
const catId = (name: string) => loadFinanceData(db).categories.find((c) => c.name === name)!.id;
const expense = () => ({ occurredOn: "2026-11-20", type: "expense" as const, amount: 25_000, accountId: dompet, categoryId: catId("Makan") });
const balanceOf = (id: number) => accountBalances(loadFinanceData(db)).get(id);

beforeEach(() => {
  db = createDb(":memory:");
  migrateDb(db);
  seedDefaults(db);
  dompet = createAccount(db, { name: "Dompet", kind: "spending", openingBalance: 0 });
  bank = createAccount(db, { name: "BCA", kind: "spending", openingBalance: 1_000_000 });
});

describe("validation", () => {
  it("rejects bad amounts and impossible dates", () => {
    for (const amount of [0, 1.5, MAX_AMOUNT + 1]) expect(() => txnInputSchema.parse({ ...expense(), amount })).toThrow();
    expect(() => txnInputSchema.parse({ ...expense(), occurredOn: "2026-02-30" })).toThrow();
  });
  it("does not allow a group on income categories", () => {
    expect(() => categoryInputSchema.parse({ name: "Gaji 2", kind: "income", group: "needs", monthlyBudget: null })).toThrow();
  });
});

describe("transactions", () => {
  it("rejects a category whose kind does not match the type", () => {
    expect(() => createTransaction(db, { ...expense(), categoryId: catId("Gaji") })).toThrow("Kategori tidak cocok dengan tipe transaksi");
  });

  it("rejects transfers to the same account or with a category", () => {
    const transfer = { occurredOn: "2026-11-20", type: "transfer" as const, amount: 10_000, accountId: bank, toAccountId: bank };
    expect(() => createTransaction(db, transfer)).toThrow("Transfer butuh akun tujuan yang berbeda");
    expect(() => createTransaction(db, { ...transfer, toAccountId: dompet, categoryId: catId("Makan") })).toThrow("Transfer tidak memakai kategori");
  });

  it("returns the existing row for a repeated externalId", () => {
    const a = createTransaction(db, { ...expense(), externalId: "t-1" }, "trading");
    expect(a.duplicate).toBe(false);
    expect(createTransaction(db, { ...expense(), externalId: "t-1" }, "trading")).toEqual({ id: a.id, duplicate: true });
    expect(loadFinanceData(db).txns).toHaveLength(1);
    expect(loadFinanceData(db).txns[0].source).toBe("trading");
  });

  it("rejects unknown and archived accounts", () => {
    expect(() => createTransaction(db, { ...expense(), accountId: 999 })).toThrow("Akun tidak ditemukan");
    const old = createAccount(db, { name: "Lama", kind: "spending", openingBalance: 0 });
    archiveAccount(db, old);
    expect(() => createTransaction(db, { ...expense(), accountId: old })).toThrow("Akun sudah diarsip");
  });

  it("updates, lists and deletes transactions", () => {
    const { id } = createTransaction(db, expense());
    createTransaction(db, { ...expense(), occurredOn: "2026-10-31" });
    updateTransaction(db, id, { ...expense(), amount: 30_000, note: "nasi" });
    const rows = listTransactions(db, { month: "2026-11" });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ amount: 30_000, note: "nasi", accountName: "Dompet", categoryName: "Makan" });
    expect(() => updateTransaction(db, 999, expense())).toThrow("Transaksi tidak ditemukan");
    deleteTransaction(db, id);
    expect(listTransactions(db, { month: "2026-11" })).toHaveLength(0);
  });

  it("refuses to edit or delete transactions of an archived account", () => {
    const lama = createAccount(db, { name: "Lama", kind: "spending", openingBalance: 50_000 });
    const spent = createTransaction(db, { ...expense(), accountId: lama, amount: 50_000 });
    const moved = createTransaction(db, { occurredOn: "2026-11-21", type: "transfer", amount: 10_000, accountId: bank, toAccountId: lama });
    createTransaction(db, { ...expense(), accountId: lama, amount: 10_000 });
    archiveAccount(db, lama);
    expect(() => updateTransaction(db, spent.id, { ...expense(), accountId: bank })).toThrow("Akun sudah diarsip");
    expect(() => deleteTransaction(db, spent.id)).toThrow("Akun sudah diarsip");
    expect(() => deleteTransaction(db, moved.id)).toThrow("Akun sudah diarsip");
    expect(balanceOf(lama)).toBe(0);
    expect(() => deleteTransaction(db, 999)).toThrow("Transaksi tidak ditemukan");
  });

  it("remembers the last account the user picked, not the trading app's", () => {
    expect(lastUsedAccountId(db)).toBeNull();
    createTransaction(db, { ...expense(), accountId: bank });
    expect(lastUsedAccountId(db)).toBe(bank);
    const broker = createAccount(db, { name: "Broker", kind: "trading", openingBalance: 0 });
    createTransaction(db, { occurredOn: "2026-11-22", type: "income", amount: 5_000, accountId: broker, categoryId: catId("Profit Trading"), externalId: "p1" }, "trading");
    expect(lastUsedAccountId(db)).toBe(bank);
    const lama = createAccount(db, { name: "Lama", kind: "spending", openingBalance: 25_000 });
    createTransaction(db, { ...expense(), accountId: lama });
    archiveAccount(db, lama);
    expect(lastUsedAccountId(db)).toBe(bank);
  });
});

describe("accounts", () => {
  it("adjusts the opening balance so the computed balance matches reality", () => {
    createTransaction(db, { ...expense(), amount: 300_000 });
    adjustBalance(db, dompet, 1_000_000);
    expect(balanceOf(dompet)).toBe(1_000_000);
    expect(loadFinanceData(db).accounts.find((a) => a.id === dompet)?.openingBalance).toBe(1_300_000);
  });

  it("refuses to archive an account that still holds money", () => {
    const sisa = createAccount(db, { name: "Sisa", kind: "spending", openingBalance: 50_000 });
    expect(() => archiveAccount(db, sisa)).toThrow("Saldo harus 0 sebelum akun diarsip");
    adjustBalance(db, sisa, 0);
    archiveAccount(db, sisa);
    expect(loadFinanceData(db).accounts.find((a) => a.id === sisa)?.archived).toBe(true);
  });
});

describe("categories and settings", () => {
  it("rejects duplicate category names of the same kind", () => {
    expect(() => createCategory(db, { name: "Makan", kind: "expense", group: "needs", monthlyBudget: null })).toThrow("Kategori sudah ada");
  });

  it("orders categories by recent usage", () => {
    const today = todayJakarta();
    for (let i = 0; i < 3; i++) createTransaction(db, { ...expense(), occurredOn: today, categoryId: catId("Hiburan") });
    createTransaction(db, { ...expense(), occurredOn: today, categoryId: catId("Transportasi") });
    const names = listCategoriesByUsage(db, "expense").map((c) => c.name);
    expect(names.indexOf("Hiburan")).toBeLessThan(names.indexOf("Transportasi"));
    expect(names.indexOf("Transportasi")).toBeLessThan(names.indexOf("Makan"));
  });

  it("updates settings", () => {
    updateSettings(db, { emergencyMonths: 3 });
    expect(loadFinanceData(db).settings.emergencyMonths).toBe(3);
  });
});
