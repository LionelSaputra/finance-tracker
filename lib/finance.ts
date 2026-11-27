import { addMonths, monthOf, monthRange, monthsUntil, sameDayLastMonth } from "./dates";
import type { Account, Category, Settings, Transaction } from "./db/schema";

export type FinanceData = { accounts: Account[]; categories: Category[]; txns: Transaction[]; settings: Settings };

export type BudgetStatus = "ok" | "warn" | "over";

export type CategoryLine = {
  id: number;
  name: string;
  kind: Category["kind"];
  group: Category["group"];
  current: number;
  previous: number;
  budget: number | null;
  status: BudgetStatus | null;
};

export type GoalLine = {
  accountId: number;
  name: string;
  target: number;
  balance: number;
  progressPct: number;
  neededPerMonth: number | null;
  targetDate: string | null;
};

export type SafeToTrade = {
  amount: number;
  freeCash: number;
  remainingBudget: number;
  emergencyTarget: number | null;
  emergencyCurrent: number;
  emergencyGap: number | null;
  reason: string | null;
};

export type FinanceSnapshot = {
  month: string;
  income: number;
  expense: number;
  categories: CategoryLine[];
  split: { needsPct: number; wantsPct: number; savingsPct: number; otherPct: number } | null;
  avgMonthlyExpense: number | null;
  emergency: { months: number; target: number; current: number; gap: number; monthsCovered: number } | null;
  goals: GoalLine[];
  safeToTrade: SafeToTrade;
  tradingResult: number;
};

type Range = { start: string; end: string };

const inRange = (t: Transaction, r: Range) => t.occurredOn >= r.start && t.occurredOn <= r.end;
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);
const pct = (part: number, whole: number) => Math.round((part / whole) * 100);

export function accountBalances(data: FinanceData): Map<number, number> {
  const balances = new Map(data.accounts.map((a) => [a.id, a.openingBalance]));
  const add = (id: number, delta: number) => balances.set(id, (balances.get(id) ?? 0) + delta);
  for (const t of data.txns) {
    if (t.type === "income") add(t.accountId, t.amount);
    else if (t.type === "expense") add(t.accountId, -t.amount);
    else if (t.toAccountId != null) {
      add(t.accountId, -t.amount);
      add(t.toAccountId, t.amount);
    }
  }
  return balances;
}

export function budgetStatus(spent: number, budget: number): BudgetStatus {
  if (budget <= 0) return spent > 0 ? "over" : "ok";
  if (spent * 100 < budget * 80) return "ok";
  return spent < budget ? "warn" : "over";
}

export function computeSnapshot(data: FinanceData, month: string, today: string): FinanceSnapshot {
  const { accounts, categories, txns, settings } = data;
  const kindOf = new Map(accounts.map((a) => [a.id, a.kind]));
  const balances = accountBalances(data);
  const active = accounts.filter((a) => !a.archived);
  const balanceOfKind = (kind: Account["kind"]) => sum(active.filter((a) => a.kind === kind).map((a) => balances.get(a.id) ?? 0));

  // Income/expense outside trading accounts; trading-account flows are trading results.
  const flows = txns.filter((t) => t.type !== "transfer" && kindOf.get(t.accountId) !== "trading");
  const tradingFlows = txns.filter((t) => t.type !== "transfer" && kindOf.get(t.accountId) === "trading");
  const byCategory = (r: Range) => {
    const m = new Map<number, number>();
    for (const t of flows) if (t.categoryId != null && inRange(t, r)) m.set(t.categoryId, (m.get(t.categoryId) ?? 0) + t.amount);
    return m;
  };
  const totalOf = (type: "income" | "expense", r: Range, src = flows) => sum(src.filter((t) => t.type === type && inRange(t, r)).map((t) => t.amount));

  // Current month is compared with the same elapsed days of last month; past months compare whole months.
  const currentMonth = monthOf(today);
  const cur = monthRange(month);
  const prevMonth = addMonths(month, -1);
  const prev = month === currentMonth ? { start: `${prevMonth}-01`, end: sameDayLastMonth(today) } : monthRange(prevMonth);

  const curByCat = byCategory(cur);
  const prevByCat = byCategory(prev);
  const lines: CategoryLine[] = categories
    .filter((c) => !c.archived || curByCat.has(c.id) || prevByCat.has(c.id))
    .map((c) => {
      const current = curByCat.get(c.id) ?? 0;
      const budget = c.monthlyBudget;
      return {
        id: c.id, name: c.name, kind: c.kind, group: c.group, current, previous: prevByCat.get(c.id) ?? 0, budget,
        status: c.kind === "expense" && budget != null ? budgetStatus(current, budget) : null,
      };
    });

  const income = totalOf("income", cur);
  const expense = totalOf("expense", cur);
  const groupTotal = (g: Category["group"]) => sum(lines.filter((l) => l.kind === "expense" && l.group === g).map((l) => l.current));
  const savedIntoKinds = new Set<Account["kind"]>(["savings", "emergency", "trading"]);
  const netSaved = sum(
    txns
      .filter((t) => t.type === "transfer" && t.toAccountId != null && inRange(t, cur))
      .map((t) => {
        const from = kindOf.get(t.accountId);
        const to = kindOf.get(t.toAccountId!);
        if (from === "spending" && to && savedIntoKinds.has(to)) return t.amount;
        if (to === "spending" && from && savedIntoKinds.has(from)) return -t.amount;
        return 0;
      }),
  );
  const split =
    income > 0
      ? { needsPct: pct(groupTotal("needs"), income), wantsPct: pct(groupTotal("wants"), income), savingsPct: pct(netSaved, income), otherPct: pct(groupTotal(null), income) }
      : null;

  // Average over the last 3 full months that have any spending; then budgets; else unknown.
  // A month only counts if tracking had already started on its first day, so a few recorded days never pass as a month.
  const trackingStart = txns.reduce<string | null>((min, t) => (min == null || t.occurredOn < min ? t.occurredOn : min), null);
  const pastTotals = [1, 2, 3]
    .map((n) => monthRange(addMonths(currentMonth, -n)))
    .filter((r) => trackingStart != null && r.start >= trackingStart)
    .map((r) => totalOf("expense", r))
    .filter((x) => x > 0);
  const budgetTotal = sum(categories.filter((c) => !c.archived && c.kind === "expense").map((c) => c.monthlyBudget ?? 0));
  const avgMonthlyExpense = pastTotals.length ? Math.round(sum(pastTotals) / pastTotals.length) : budgetTotal > 0 ? budgetTotal : null;

  const emergencyCurrent = balanceOfKind("emergency");
  const emergency =
    avgMonthlyExpense == null
      ? null
      : (() => {
          const target = settings.emergencyMonths * avgMonthlyExpense;
          return { months: settings.emergencyMonths, target, current: emergencyCurrent, gap: Math.max(0, target - emergencyCurrent), monthsCovered: emergencyCurrent / avgMonthlyExpense };
        })();

  const spentThisMonth = byCategory(monthRange(currentMonth));
  const remainingBudget = sum(
    categories
      .filter((c) => !c.archived && c.kind === "expense" && c.monthlyBudget != null)
      .map((c) => Math.max(0, c.monthlyBudget! - (spentThisMonth.get(c.id) ?? 0))),
  );
  const freeCash = balanceOfKind("spending");
  const safeToTrade: SafeToTrade = emergency
    ? {
        amount: Math.max(0, freeCash - remainingBudget - emergency.gap),
        freeCash, remainingBudget, emergencyTarget: emergency.target, emergencyCurrent, emergencyGap: emergency.gap, reason: null,
      }
    : { amount: 0, freeCash, remainingBudget, emergencyTarget: null, emergencyCurrent, emergencyGap: null, reason: "belum cukup data" };

  const goals: GoalLine[] = active
    .filter((a) => a.kind === "savings" && a.targetAmount != null && a.targetAmount > 0)
    .map((a) => {
      const balance = balances.get(a.id) ?? 0;
      const target = a.targetAmount!;
      return {
        accountId: a.id, name: a.name, target, balance, progressPct: pct(balance, target), targetDate: a.targetDate,
        neededPerMonth: a.targetDate ? Math.max(0, Math.ceil((target - balance) / monthsUntil(today, a.targetDate))) : null,
      };
    });

  return {
    month, income, expense, categories: lines, split, avgMonthlyExpense, emergency, goals, safeToTrade,
    tradingResult: totalOf("income", cur, tradingFlows) - totalOf("expense", cur, tradingFlows),
  };
}
