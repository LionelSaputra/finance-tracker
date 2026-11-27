import { rejectWithoutApiToken } from "@/lib/auth/api-token";
import { loadFinanceData } from "@/lib/data/load";
import { monthOf, todayJakarta } from "@/lib/dates";
import { getDb } from "@/lib/db";
import { computeSnapshot } from "@/lib/finance";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const denied = rejectWithoutApiToken(req);
  if (denied) return denied;
  const today = todayJakarta();
  const { amount, reason, ...breakdown } = computeSnapshot(loadFinanceData(getDb()), monthOf(today), today).safeToTrade;
  return Response.json({ currency: "IDR", amount, breakdown, reason, asOf: new Date().toISOString() });
}
