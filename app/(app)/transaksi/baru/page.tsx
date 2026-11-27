import Link from "next/link";
import { TransactionForm } from "@/components/TransactionForm";
import { requireSession } from "@/lib/auth/session";
import { listCategoriesByUsage } from "@/lib/data/categories";
import { loadFinanceData } from "@/lib/data/load";
import { lastUsedAccountId } from "@/lib/data/transactions";
import { todayJakarta } from "@/lib/dates";
import { getDb } from "@/lib/db";

export default async function NewTransactionPage() {
  await requireSession();
  const db = getDb();
  const accounts = loadFinanceData(db).accounts.filter((a) => !a.archived);
  if (!accounts.length) {
    return (
      <p className="text-slate-600">
        Tambahkan akun dulu di{" "}
        <Link href="/akun" className="text-teal-700 underline">
          halaman Akun
        </Link>
        .
      </p>
    );
  }
  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">Catat transaksi</h1>
      <TransactionForm
        accounts={accounts}
        categories={{ expense: listCategoriesByUsage(db, "expense"), income: listCategoriesByUsage(db, "income") }}
        defaults={{ accountId: lastUsedAccountId(db), occurredOn: todayJakarta() }}
      />
    </div>
  );
}
