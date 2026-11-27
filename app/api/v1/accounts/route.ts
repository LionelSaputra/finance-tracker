import { rejectWithoutApiToken } from "@/lib/auth/api-token";
import { loadFinanceData } from "@/lib/data/load";
import { getDb } from "@/lib/db";
import { accountBalances } from "@/lib/finance";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const denied = rejectWithoutApiToken(req);
  if (denied) return denied;
  const data = loadFinanceData(getDb());
  const balances = accountBalances(data);
  return Response.json(
    data.accounts.filter((a) => !a.archived).map((a) => ({ id: a.id, name: a.name, kind: a.kind, balance: balances.get(a.id) ?? 0 })),
  );
}
