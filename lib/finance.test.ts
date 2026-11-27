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

  it("ignores entries dated after asOf", () => {
    const a = acc({ name: "A", kind: "spending", openingBalance: 500_000 });
    const gaji = cat({ name: "Gaji", kind: "income" });
    const d = data([a], [gaji], [tx({ occurredOn: "2026-12-25", type: "income", amount: 8_000_000, accountId: a.id, categoryId: gaji.id })]);
    expect(accountBalances(d, "2026-12-05").get(a.id)).toBe(500_000);
    expect(accountBalances(d).get(a.id)).toBe(8_500_000);
    // A salary recorded ahead of time must not raise today's safe amount.
    expect(computeSnapshot(d, "2026-12", "2026-12-05").safeToTrade.freeCash).toBe(500_000);
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
      spend("2026-08-01", 3_000_000), spend("2026-09-10", 4_000_000), spend("2026-10-10", 5_000_000), spend("2026-11-05", 1_000_000),
    ]);
    return { d, dompet, darurat, trading, makan };
  };

  it("computes the safe-to-trade amount with its breakdown", () => {
    const snap = computeSnapshot(mainFixture().d, "2026-11", "2026-11-27");
    expect(snap.avgMonthlyExpense).toBe(4_000_000);
    expect(snap.safeToTrade).toEqual({
      // Usual month 4.000.000 − 1.000.000 spent = 3.000.000 reserved, more than the 2.000.000 left in budgets.
      amount: 850_000, freeCash: 6_100_000, remainingBudget: 3_000_000,
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

  it("does not average a month in which tracking started part-way", () => {
    // Tracking starts 27 Nov; only 4 days of November are recorded by 1 Dec.
    const bca = acc({ name: "BCA", kind: "spending", openingBalance: 10_000_000 });
    const darurat = acc({ name: "Darurat", kind: "emergency", openingBalance: 5_000_000 });
    const makan = cat({ name: "Makan", kind: "expense", group: "needs", monthlyBudget: 5_000_000 });
    const txns = [tx({ occurredOn: "2026-11-28", type: "expense", amount: 500_000, accountId: bca.id, categoryId: makan.id })];
    const withBudget = computeSnapshot(data([bca, darurat], [makan], txns), "2026-12", "2026-12-01");
    expect(withBudget.avgMonthlyExpense).toBe(5_000_000);
    expect(withBudget.safeToTrade.amount).toBe(0);

    const noBudget = computeSnapshot(data([bca, darurat], [{ ...makan, monthlyBudget: null }], txns), "2026-12", "2026-12-01");
    expect(noBudget.safeToTrade).toMatchObject({ amount: 0, reason: "belum cukup data" });
  });

  it("reserves the rest of a usual month when no budgets are set", () => {
    const dompet = acc({ name: "Dompet", kind: "spending", openingBalance: 22_000_000 });
    const darurat = acc({ name: "Darurat", kind: "emergency", openingBalance: 30_000_000 });
    const makan = cat({ name: "Makan", kind: "expense", group: "needs" });
    const spend = (occurredOn: string, amount: number) => tx({ occurredOn, type: "expense", amount, accountId: dompet.id, categoryId: makan.id });
    const d = data([dompet, darurat], [makan], [
      spend("2026-08-01", 4_000_000), spend("2026-09-01", 4_000_000), spend("2026-10-01", 4_000_000), spend("2026-11-05", 1_500_000),
    ]);
    // Saldo 22.000.000 − 13.500.000 spent = 8.500.000; reserve 4.000.000 − 1.500.000 = 2.500.000; emergency already full.
    expect(computeSnapshot(d, "2026-11", "2026-11-27").safeToTrade).toMatchObject({ amount: 6_000_000, freeCash: 8_500_000, remainingBudget: 2_500_000, emergencyGap: 0 });
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

describe("month pace", () => {
  const wallet = acc({ name: "Dompet", kind: "spending", openingBalance: 50_000_000 });
  const makan = cat({ name: "Makan", kind: "expense", group: "needs", monthlyBudget: 3_000_000 });
  const spend = (occurredOn: string, amount: number) => tx({ occurredOn, type: "expense", amount, accountId: wallet.id, categoryId: makan.id });
  const pace = (txns: Transaction[], month: string, today: string) => computeSnapshot(data([wallet], [makan], txns), month, today).pace;

  it("is aman while spending trails the month, with the rest split over the days left including today", () => {
    const p = pace([spend("2026-11-03", 1_000_000), spend("2026-11-20", 500_000)], "2026-11", "2026-11-27");
    expect(p).toMatchObject({ allowance: 3_000_000, allowanceSource: "budget", spent: 1_500_000, remaining: 1_500_000, daysLeft: 4, perDay: 375_000, status: "aman" });
    expect(p.days).toHaveLength(30);
    expect(p.days.find((d) => d.date === "2026-11-03")).toEqual({ date: "2026-11-03", spent: 1_000_000, ahead: true });
    expect(p.days.find((d) => d.date === "2026-11-20")?.ahead).toBe(false);
  });

  it("is mepet when spending runs more than 10 points ahead of the days gone by", () => {
    // Day 15 of 30 = 50% of the month; 1.800.000 of 3.000.000 = 60% spent: not yet over the margin.
    expect(pace([spend("2026-11-10", 1_800_000)], "2026-11", "2026-11-15").status).toBe("aman");
    expect(pace([spend("2026-11-10", 1_810_000)], "2026-11", "2026-11-15").status).toBe("mepet");
  });

  it("is lewat once the allowance is used up, and judges a past month as a whole", () => {
    expect(pace([spend("2026-11-10", 3_100_000)], "2026-11", "2026-11-15")).toMatchObject({ status: "lewat", remaining: -100_000, perDay: 0 });
    expect(pace([spend("2026-10-02", 2_900_000)], "2026-10", "2026-11-15")).toMatchObject({ status: "aman", daysLeft: 0, perDay: null });
  });

  it("has nothing to judge for a future month or without budget and history", () => {
    expect(pace([], "2026-12", "2026-11-15")).toMatchObject({ status: null, remaining: null });
    const noBudget = computeSnapshot(data([wallet], [{ ...makan, monthlyBudget: null }], []), "2026-11", "2026-11-15").pace;
    expect(noBudget).toMatchObject({ allowance: null, allowanceSource: null, status: null });
  });
});
