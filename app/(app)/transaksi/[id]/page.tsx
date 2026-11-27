import { notFound } from "next/navigation";
import { ActionForm } from "@/components/ActionForm";
import { TransactionForm } from "@/components/TransactionForm";
import { requireSession } from "@/lib/auth/session";
import { listCategoriesByUsage } from "@/lib/data/categories";
import { loadFinanceData } from "@/lib/data/load";
import { todayJakarta } from "@/lib/dates";
import { getDb } from "@/lib/db";
import { removeTransaction } from "../actions";

export default async function EditTransactionPage({ params }: PageProps<"/transaksi/[id]">) {
  await requireSession();
  const db = getDb();
  const data = loadFinanceData(db);
  const id = Number((await params).id);
  const t = data.txns.find((x) => x.id === id);
  if (!t) notFound();
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Ubah transaksi</h1>
      {t.source === "trading" && <p className="text-sm text-slate-600">Dicatat oleh aplikasi trading.</p>}
      <TransactionForm
        accounts={data.accounts.filter((a) => !a.archived)}
        categories={{ expense: listCategoriesByUsage(db, "expense"), income: listCategoriesByUsage(db, "income") }}
        defaults={{ accountId: t.accountId, occurredOn: todayJakarta() }}
        initial={t}
      />
      <ActionForm action={removeTransaction.bind(null, t.id)} submitLabel="Hapus transaksi" danger confirm="Hapus transaksi ini?" />
    </div>
  );
}
