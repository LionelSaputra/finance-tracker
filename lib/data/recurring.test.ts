import { beforeEach, describe, expect, it } from "vitest";
import { createDb, type Db } from "../db";
import { migrateDb } from "../db/migrate";
import { seedDefaults } from "../db/seed";
import { createAccount } from "./accounts";
import { loadFinanceData } from "./load";
import { createRecurring, dueDate, dueRecurring, handleRecurring } from "./recurring";

let db: Db;
let bank: number;
const catId = (name: string) => loadFinanceData(db).categories.find((c) => c.name === name)!.id;

beforeEach(() => {
  db = createDb(":memory:");
  migrateDb(db);
  seedDefaults(db);
  bank = createAccount(db, { name: "BCA", kind: "spending", openingBalance: 0 });
});

describe("recurring entries", () => {
  it("clamps the day to the month's length", () => {
    expect(dueDate({ dayOfMonth: 31 }, "2026-11")).toBe("2026-11-30");
    expect(dueDate({ dayOfMonth: 31 }, "2028-02")).toBe("2028-02-29");
  });

  it("becomes due on its day, posts once on the due date, and comes back next month", () => {
    const id = createRecurring(db, { type: "expense", amount: 186_000, accountId: bank, categoryId: catId("Langganan"), note: "Netflix", dayOfMonth: 25 });
    expect(dueRecurring(db, "2026-11-24")).toHaveLength(0);
    expect(dueRecurring(db, "2026-11-27").map((r) => r.note)).toEqual(["Netflix"]);
    handleRecurring(db, id, "2026-11", "2026-11-27", "post");
    handleRecurring(db, id, "2026-11", "2026-11-27", "post");
    const txns = loadFinanceData(db).txns;
    expect(txns).toHaveLength(1);
    expect(txns[0]).toMatchObject({ occurredOn: "2026-11-25", amount: 186_000, note: "Netflix" });
    expect(dueRecurring(db, "2026-11-30")).toHaveLength(0);
    expect(dueRecurring(db, "2026-12-26")).toHaveLength(1);
  });

  it("can be skipped for a month without recording anything", () => {
    const id = createRecurring(db, { type: "income", amount: 8_000_000, accountId: bank, categoryId: catId("Gaji"), note: null, dayOfMonth: 1 });
    handleRecurring(db, id, "2026-11", "2026-11-05", "skip");
    expect(dueRecurring(db, "2026-11-05")).toHaveLength(0);
    expect(loadFinanceData(db).txns).toHaveLength(0);
  });

  it("still shows last month's entry when the app was not opened in time, then this month's", () => {
    const id = createRecurring(db, { type: "income", amount: 8_000_000, accountId: bank, categoryId: catId("Gaji"), note: "Gaji", dayOfMonth: 25 });
    handleRecurring(db, id, "2026-09", "2026-09-26", "post");
    // October was never opened; on 2 November October's salary is still waiting.
    expect(dueRecurring(db, "2026-11-02").map((r) => r.pendingMonth)).toEqual(["2026-10"]);
    handleRecurring(db, id, "2026-10", "2026-11-02", "post");
    expect(loadFinanceData(db).txns.map((t) => t.occurredOn)).toEqual(["2026-09-25", "2026-10-25"]);
    expect(dueRecurring(db, "2026-11-02")).toHaveLength(0);
    expect(dueRecurring(db, "2026-11-25").map((r) => r.pendingMonth)).toEqual(["2026-11"]);
    // A stale tap for a month already handled does nothing.
    handleRecurring(db, id, "2026-10", "2026-11-25", "post");
    expect(loadFinanceData(db).txns).toHaveLength(2);
  });

  it("rejects a category of the wrong kind and an impossible day", () => {
    const base = { type: "expense" as const, amount: 10_000, accountId: bank, categoryId: catId("Gaji"), note: null, dayOfMonth: 5 };
    expect(() => createRecurring(db, base)).toThrow("Kategori tidak cocok dengan tipe transaksi");
    expect(() => createRecurring(db, { ...base, categoryId: catId("Makan"), dayOfMonth: 32 })).toThrow("Tanggal harus 1 sampai 31");
  });
});
