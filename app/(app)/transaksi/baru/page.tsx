import Link from "next/link";
import { TransactionForm } from "@/components/TransactionForm";
import { requireSession } from "@/lib/auth/session";
import { listCategoriesByUsage } from "@/lib/data/categories";
import { loadFinanceData } from "@/lib/data/load";
import { lastUsedAccountId } from "@/lib/data/transactions";
import { todayJakarta } from "@/lib/dates";
import { getDb } from "@/lib/db";

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function NewTransactionPage({ searchParams }: PageProps<"/transaksi/baru">) {
  await requireSession();
  const db = getDb();
  const accounts = loadFinanceData(db).accounts.filter((a) => !a.archived);
  if (!accounts.length) {
    return (
      <p className="py-8 text-ink-2">
        Tambahkan akun dulu di{" "}
        <Link href="/akun" className="font-semibold text-ink underline">
          halaman Akun
        </Link>
        .
      </p>
    );
  }
  // ?tipe=transfer&ke=<id>&dari=<id> comes from Beranda's "Catat setor"; unknown ids are ignored.
  const sp = await searchParams;
  const known = (v: string | undefined) => accounts.find((a) => a.id === Number(v))?.id ?? null;
  const isTransfer = one(sp.tipe) === "transfer";
  return (
    <div className="mx-auto max-w-lg space-y-5 py-5">
      <h1 className="font-narrow text-3xl font-bold">{isTransfer ? "Catat setor / transfer" : "Catat transaksi"}</h1>
      <TransactionForm
        accounts={accounts}
        categories={{ expense: listCategoriesByUsage(db, "expense"), income: listCategoriesByUsage(db, "income") }}
        defaults={{
          accountId: (isTransfer && known(one(sp.dari))) || lastUsedAccountId(db),
          occurredOn: todayJakarta(),
          type: isTransfer ? "transfer" : undefined,
          toAccountId: isTransfer ? known(one(sp.ke)) : null,
        }}
      />
    </div>
  );
}
