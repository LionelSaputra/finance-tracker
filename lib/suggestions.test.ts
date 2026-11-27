import { describe, expect, it } from "vitest";
import type { CategoryLine, FinanceSnapshot } from "./finance";
import { ruleSuggestions } from "./suggestions";

const line = (p: Partial<CategoryLine>): CategoryLine => ({
  id: 1, name: "Makan", kind: "expense", group: "needs", current: 0, previous: 0, budget: null, status: null, ...p,
});

const snap = (p: Partial<FinanceSnapshot> = {}): FinanceSnapshot => ({
  month: "2026-11", income: 0, expense: 0, categories: [], split: null, avgMonthlyExpense: 4_000_000, emergency: null, goals: [],
  safeToTrade: { amount: 0, freeCash: 0, remainingBudget: 0, emergencyTarget: null, emergencyCurrent: 0, emergencyGap: null, reason: null },
  tradingResult: 0, pace: { allowance: null, allowanceSource: null, spent: 0, remaining: null, daysLeft: 0, perDay: null, status: null, days: [] }, ...p,
});

describe("ruleSuggestions", () => {
  it("flags budgets at 80% as warn and at 100% as alert", () => {
    const s = ruleSuggestions(snap({ categories: [
      line({ name: "Makan di Luar", current: 1_050_000, budget: 1_000_000, status: "over" }),
      line({ id: 2, name: "Hiburan", current: 920_000, budget: 1_000_000, status: "warn" }),
      line({ id: 3, name: "Makan", current: 100_000, budget: 1_000_000, status: "ok" }),
    ] }));
    expect(s).toContainEqual(expect.objectContaining({ level: "alert", text: "Makan di Luar sudah 105% dari budget" }));
    expect(s).toContainEqual(expect.objectContaining({ level: "warn", text: "Hiburan sudah 92% dari budget" }));
    expect(s.some((x) => x.text.startsWith("Makan sudah"))).toBe(false);
  });

  it("flags a spike only when it is at least 30% and at least Rp100.000", () => {
    const spike = (previous: number, current: number) =>
      ruleSuggestions(snap({ categories: [line({ name: "Transportasi", previous, current })] })).filter((x) => x.text.includes("naik"));
    expect(spike(1_000_000, 1_290_000)).toEqual([]);
    expect(spike(300_000, 390_000)).toEqual([]);
    expect(spike(0, 500_000)).toEqual([]);
    expect(spike(1_000_000, 1_300_000)).toEqual([expect.objectContaining({ level: "warn", text: "Transportasi naik 30% dibanding periode yang sama bulan lalu" })]);
  });

  it("checks the 50/30/20 split", () => {
    const s = ruleSuggestions(snap({ split: { needsPct: 55, wantsPct: 31, savingsPct: 10, otherPct: 0 } }));
    expect(s).toContainEqual(expect.objectContaining({ level: "warn", text: "Kebutuhan 55% dari pemasukan (batas 50%)" }));
    expect(s).toContainEqual(expect.objectContaining({ level: "warn", text: "Keinginan 31% dari pemasukan (batas 30%)" }));
    expect(s).toContainEqual(expect.objectContaining({ level: "info", text: "Tabungan & investasi baru 10% dari pemasukan (target 20%)" }));
  });

  it("says why there is no 50/30/20 check when no income is recorded", () => {
    const msg = expect.objectContaining({ level: "info", text: "Belum ada pemasukan tercatat di November 2026, jadi pembagian 50/30/20 belum bisa dihitung" });
    expect(ruleSuggestions(snap({ income: 0, expense: 300_000, split: null }))).toContainEqual(msg);
    expect(ruleSuggestions(snap({ income: 0, expense: 0, split: null }))).not.toContainEqual(msg);
  });

  it("reports emergency fund coverage and goal pace", () => {
    const s = ruleSuggestions(snap({
      emergency: { months: 6, target: 24_000_000, current: 21_750_000, gap: 2_250_000, monthsCovered: 5.4375 },
      goals: [{ accountId: 9, name: "Laptop", target: 12_000_000, balance: 3_000_000, progressPct: 25, neededPerMonth: 1_500_000, targetDate: "2027-05-27" }],
    }));
    expect(s).toContainEqual(expect.objectContaining({ level: "info", text: "Dana darurat baru 5,4 dari 6 bulan pengeluaran" }));
    const goal = s.find((x) => x.text.startsWith('Target "Laptop"'));
    expect(goal?.text.replace(/\s/g, " ")).toBe('Target "Laptop": sisihkan Rp 1.500.000 per bulan');
  });

  it("explains when the safe amount cannot be computed, and sorts alerts first", () => {
    const s = ruleSuggestions(snap({
      safeToTrade: { amount: 0, freeCash: 0, remainingBudget: 0, emergencyTarget: null, emergencyCurrent: 0, emergencyGap: null, reason: "belum cukup data" },
      categories: [line({ name: "Belanja", current: 2_000_000, budget: 1_000_000, status: "over" })],
    }));
    expect(s[0].level).toBe("alert");
    expect(s).toContainEqual(expect.objectContaining({ level: "info", text: "Dana aman trading belum bisa dihitung: catat pengeluaran atau isi budget dulu" }));
  });
});
