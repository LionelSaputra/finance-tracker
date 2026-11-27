import type { FinanceSnapshot } from "./finance";
import { formatIDR } from "./money";

/** kind lets a page drop suggestions it already shows elsewhere (budget rows, goals, the safe-to-trade leaf). */
export type Suggestion = { level: "info" | "warn" | "alert"; kind: "budget" | "spike" | "split" | "emergency" | "goal" | "data"; text: string };

const SPIKE_PCT = 30;
const SPIKE_MIN = 100_000;
const order = { alert: 0, warn: 1, info: 2 } as const;
const monthName = (m: string) => new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${m}-01T00:00:00Z`));
const oneDecimal = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 });

export function ruleSuggestions(s: FinanceSnapshot): Suggestion[] {
  const out: Suggestion[] = [];

  for (const c of s.categories) {
    if (c.kind !== "expense") continue;
    if (c.budget != null && c.budget > 0 && (c.status === "warn" || c.status === "over")) {
      out.push({ level: c.status === "over" ? "alert" : "warn", kind: "budget", text: `${c.name} sudah ${Math.round((c.current / c.budget) * 100)}% dari budget` });
    }
    const rise = c.current - c.previous;
    if (c.previous > 0 && rise >= SPIKE_MIN && rise * 100 >= c.previous * SPIKE_PCT) {
      out.push({ level: "warn", kind: "spike", text: `${c.name} naik ${Math.round((rise / c.previous) * 100)}% dibanding periode yang sama bulan lalu` });
    }
  }

  if (!s.split && s.expense > 0) {
    out.push({ level: "info", kind: "split", text: `Belum ada pemasukan tercatat di ${monthName(s.month)}, jadi pembagian 50/30/20 belum bisa dihitung` });
  }
  if (s.split) {
    if (s.split.needsPct > 50) out.push({ level: "warn", kind: "split", text: `Kebutuhan ${s.split.needsPct}% dari pemasukan (batas 50%)` });
    if (s.split.wantsPct > 30) out.push({ level: "warn", kind: "split", text: `Keinginan ${s.split.wantsPct}% dari pemasukan (batas 30%)` });
    if (s.split.savingsPct < 20) out.push({ level: "info", kind: "split", text: `Tabungan & investasi baru ${s.split.savingsPct}% dari pemasukan (target 20%)` });
  }

  if (s.emergency && s.emergency.gap > 0) {
    out.push({ level: "info", kind: "emergency", text: `Dana darurat baru ${oneDecimal.format(s.emergency.monthsCovered)} dari ${s.emergency.months} bulan pengeluaran` });
  }

  for (const g of s.goals) {
    if (g.neededPerMonth) out.push({ level: "info", kind: "goal", text: `Target "${g.name}": sisihkan ${formatIDR(g.neededPerMonth)} per bulan` });
  }

  if (s.safeToTrade.reason) {
    out.push({ level: "info", kind: "data", text: "Dana aman trading belum bisa dihitung: catat pengeluaran atau isi budget dulu" });
  }

  return out.sort((a, b) => order[a.level] - order[b.level]);
}
