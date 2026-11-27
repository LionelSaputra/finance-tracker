import { describe, expect, it } from "vitest";
import type { Account, Category, Transaction } from "./db/schema";
import { accountBalances, budgetStatus, computeSnapshot, type FinanceData } from "./finance";

let nextId = 1;
const acc = (p: Partial<Account> & Pick<Account, "name" | "kind">): Account => ({
  id: nextId++, openingBalance: 0, targetAmount: null, targetDate: null, archived: false, createdAt: "", ...p,
});
const cat = (p: Partial<Category> & Pick<Category, "name" | "kind">): Category => ({
  id: nextId++, group: null, monthlyBudget: null, archived: false, ...p,
});
const tx = (p: Partial<Transaction> & Pick<Transaction, "occurredOn" | "type" | "amount" | "accountId">): Transaction => ({
  id: nextId++, toAccountId: null, categoryId: null, note: null, source: "manual", externalId: null, createdAt: "", updatedAt: "", ...p,
});
const data = (accounts: Account[], categories: Category[], txns: Transaction[], emergencyMonths = 6): FinanceData => ({
  accounts, categories, txns, settings: { id: 1, emergencyMonths },
});

describe("accountBalances", () => {
  it("adds income and incoming transfers, subtracts expenses and outgoing transfers", () => {
    const a = acc({ name: "A", kind: "spending", openingBalance: 1_000_000 });
    const b = acc({ name: "B", kind: "savings" });
    const gaji = cat({ name: "Gaji", kind: "income" });
    const makan = cat({ name: "Makan", kind: "expense", group: "needs" });
    const d = data([a, b], [gaji, makan], [
      tx({ occurredOn: "2026-11-01", type: "income", amount: 500_000, accountId: a.id, categoryId: gaji.id }),
      tx({ occurredOn: "2026-11-02", type: "expense", amount: 200_000, accountId: a.id, categoryId: makan.id }),
      tx({ occurredOn: "2026-11-03", type: "transfer", amount: 100_000, accountId: a.id, toAccountId: b.id }),
      tx({ occurredOn: "2026-11-04", type: "transfer", amount: 50_000, accountId: b.id, toAccountId: a.id }),
    ]);
    expect(accountBalances(d).get(a.id)).toBe(1_250_000);
    expect(accountBalances(d).get(b.id)).toBe(50_000);
  });
});

describe("budgetStatus", () => {
  it("is ok below 80%, warn from 80%, over from 100%", () => {
    expect([budgetStatus(79_999, 100_000), budgetStatus(80_000, 100_000), budgetStatus(100_000, 100_000)]).toEqual(["ok", "warn", "over"]);
    expect([budgetStatus(0, 0), budgetStatus(1, 0)]).toEqual(["ok", "over"]);
  });
});

describe("computeSnapshot", () => {
  // Dompet ends at 6.100.000 after 13.000.000 of expenses; Darurat holds 21.750.000.
  const mainFixture = () => {
    const dompet = acc({ name: "Dompet", kind: "spending", openingBalance: 19_100_000 });
    const darurat = acc({ name: "Darurat", kind: "emergency", openingBalance: 21_750_000 });
    const trading = acc({ name: "Trading", kind: "trading" });
    const makan = cat({ name: "Makan", kind: "expense", group: "needs", monthlyBudget: 3_000_000 });
    const spend = (occurredOn: string, amount: number) => tx({ occurredOn, type: "expense", amount, accountId: dompet.id, categoryId: makan.id });
    const d = data([dompet, darurat, trading], [makan], [
      spend("2026-08-10", 3_000_000), spend("2026-09-10", 4_000_000), spend("2026-10-10", 5_000_000), spend("2026-11-05", 1_000_000),
    ]);
    return { d, dompet, darurat, trading, makan };
  };

  it("computes the safe-to-trade amount with its breakdown", () => {
    const snap = computeSnapshot(mainFixture().d, "2026-11", "2026-11-27");
    expect(snap.avgMonthlyExpense).toBe(4_000_000);
    expect(snap.safeToTrade).toEqual({
      amount: 1_850_000, freeCash: 6_100_000, remainingBudget: 2_000_000,
      emergencyTarget: 24_000_000, emergencyCurrent: 21_750_000, emergencyGap: 2_250_000, reason: null,
    });
    expect(snap.emergency).toEqual({ months: 6, target: 24_000_000, current: 21_750_000, gap: 2_250_000, monthsCovered: 5.4375 });
    expect(snap.categories.find((c) => c.name === "Makan")).toMatchObject({ current: 1_000_000, budget: 3_000_000, status: "ok" });
  });

  it("keeps trading-account flows out of spending analytics", () => {
    const { d, trading } = mainFixture();
    const rugi = cat({ name: "Rugi & Biaya Trading", kind: "expense" });
    d.categories.push(rugi);
    d.txns.push(tx({ occurredOn: "2026-11-10", type: "expense", amount: 300_000, accountId: trading.id, categoryId: rugi.id }));
    const snap = computeSnapshot(d, "2026-11", "2026-11-27");
    expect(snap.categories.find((c) => c.id === rugi.id)?.current ?? 0).toBe(0);
    expect(snap.expense).toBe(1_000_000);
    expect(snap.tradingResult).toBe(-300_000);
  });

  it("compares the current month with the same elapsed days of last month", () => {
    const dompet = acc({ name: "Dompet", kind: "spending" });
    const makan = cat({ name: "Makan", kind: "expense", group: "needs" });
    const spend = (occurredOn: string, amount: number) => tx({ occurredOn, type: "expense", amount, accountId: dompet.id, categoryId: makan.id });
    const d = data([dompet], [makan], [spend("2026-02-15", 100), spend("2026-02-20", 1_000), spend("2026-03-10", 50)]);
    expect(computeSnapshot(d, "2026-03", "2026-03-15").categories[0]).toMatchObject({ current: 50, previous: 100 });
    // 31 March: last month is clamped to 28 Feb, so all of February counts.
    expect(computeSnapshot(d, "2026-03", "2026-03-31").categories[0]).toMatchObject({ previous: 1_100 });
  });

  it("compares full months for a past month", () => {
    const dompet = acc({ name: "Dompet", kind: "spending" });
    const makan = cat({ name: "Makan", kind: "expense", group: "needs" });
    const spend = (occurredOn: string, amount: number) => tx({ occurredOn, type: "expense", amount, accountId: dompet.id, categoryId: makan.id });
    const d = data([dompet], [makan], [spend("2025-12-31", 700), spend("2026-01-31", 300)]);
    expect(computeSnapshot(d, "2026-01", "2026-03-31").categories[0]).toMatchObject({ current: 300, previous: 700 });
  });

  it("splits income into needs, wants and savings", () => {
    const dompet = acc({ name: "Dompet", kind: "spending" });
    const darurat = acc({ name: "Darurat", kind: "emergency" });
    const gaji = cat({ name: "Gaji", kind: "income" });
    const makan = cat({ name: "Makan", kind: "expense", group: "needs" });
    const hiburan = cat({ name: "Hiburan", kind: "expense", group: "wants" });
    const d = data([dompet, darurat], [gaji, makan, hiburan], [
      tx({ occurredOn: "2026-11-01", type: "income", amount: 10_000_000, accountId: dompet.id, categoryId: gaji.id }),
      tx({ occurredOn: "2026-11-02", type: "expense", amount: 4_000_000, accountId: dompet.id, categoryId: makan.id }),
      tx({ occurredOn: "2026-11-03", type: "expense", amount: 3_500_000, accountId: dompet.id, categoryId: hiburan.id }),
      tx({ occurredOn: "2026-11-04", type: "transfer", amount: 2_000_000, accountId: dompet.id, toAccountId: darurat.id }),
    ]);
    expect(computeSnapshot(d, "2026-11", "2026-11-27").split).toEqual({ needsPct: 40, wantsPct: 35, savingsPct: 20, otherPct: 0 });
    expect(computeSnapshot(data([dompet], [makan], []), "2026-11", "2026-11-27").split).toBeNull();
  });

  it("falls back to the budget total, then to belum cukup data", () => {
    const dompet = acc({ name: "Dompet", kind: "spending", openingBalance: 5_000_000 });
    const makan = cat({ name: "Makan", kind: "expense", group: "needs", monthlyBudget: 1_500_000 });
    const hiburan = cat({ name: "Hiburan", kind: "expense", group: "wants", monthlyBudget: 1_000_000 });
    expect(computeSnapshot(data([dompet], [makan, hiburan], []), "2026-11", "2026-11-27").avgMonthlyExpense).toBe(2_500_000);

    const noBudget = computeSnapshot(data([dompet], [cat({ name: "Makan", kind: "expense", group: "needs" })], []), "2026-11", "2026-11-27");
    expect(noBudget.avgMonthlyExpense).toBeNull();
    expect(noBudget.emergency).toBeNull();
    expect(noBudget.safeToTrade).toEqual({
      amount: 0, freeCash: 5_000_000, remainingBudget: 0, emergencyTarget: null, emergencyCurrent: 0, emergencyGap: null, reason: "belum cukup data",
    });
  });

  it("never returns a negative safe amount", () => {
    const dompet = acc({ name: "Dompet", kind: "spending", openingBalance: 5_000_000 });
    const darurat = acc({ name: "Darurat", kind: "emergency", openingBalance: 10_000_000 });
    const makan = cat({ name: "Makan", kind: "expense", group: "needs", monthlyBudget: 3_000_000 });
    const spend = (occurredOn: string, amount: number) => tx({ occurredOn, type: "expense", amount, accountId: dompet.id, categoryId: makan.id });
    const d = data([dompet, darurat], [makan], [
      spend("2026-08-01", 1_000_000), spend("2026-09-01", 1_000_000), spend("2026-10-01", 1_000_000), spend("2026-11-01", 1_000_000),
    ]);
    expect(computeSnapshot(d, "2026-11", "2026-11-27").safeToTrade).toMatchObject({
      amount: 0, freeCash: 1_000_000, remainingBudget: 2_000_000, emergencyGap: 0, reason: null,
    });
  });

  it("tracks savings goals and the monthly amount still needed", () => {
    const laptop = acc({ name: "Laptop", kind: "savings", openingBalance: 3_000_000, targetAmount: 12_000_000, targetDate: "2027-05-27" });
    const snap = computeSnapshot(data([laptop], [], []), "2026-11", "2026-11-27");
    expect(snap.goals[0]).toMatchObject({ name: "Laptop", target: 12_000_000, balance: 3_000_000, progressPct: 25, neededPerMonth: 1_500_000 });
  });
});
