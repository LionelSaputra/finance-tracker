import { rejectWithoutApiToken } from "@/lib/auth/api-token";
import { loadFinanceData } from "@/lib/data/load";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const denied = rejectWithoutApiToken(req);
  if (denied) return denied;
  return Response.json(
    loadFinanceData(getDb())
      .categories.filter((c) => !c.archived)
      .map((c) => ({ id: c.id, name: c.name, kind: c.kind, group: c.group })),
  );
}
