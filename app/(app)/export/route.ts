import { requireSession } from "@/lib/auth/session";
import { toCsv } from "@/lib/csv";
import { loadFinanceData } from "@/lib/data/load";
import { todayJakarta } from "@/lib/dates";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  await requireSession();
  const data = loadFinanceData(getDb());
  const acc = new Map(data.accounts.map((a) => [a.id, a.name]));
  const cat = new Map(data.categories.map((c) => [c.id, c.name]));
  const rows = [...data.txns]
    .sort((a, b) => a.occurredOn.localeCompare(b.occurredOn) || a.id - b.id)
    .map((t) => [
      t.occurredOn, t.type, t.amount, acc.get(t.accountId) ?? "",
      t.toAccountId ? (acc.get(t.toAccountId) ?? "") : "", t.categoryId ? (cat.get(t.categoryId) ?? "") : "", t.note ?? "", t.source,
    ]);
  const csv = toCsv([["tanggal", "tipe", "jumlah", "akun", "akun_tujuan", "kategori", "catatan", "sumber"], ...rows]);
  // BOM so Excel opens the UTF-8 file with the right characters.
  return new Response(`﻿${csv}`, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="finance-${todayJakarta()}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
