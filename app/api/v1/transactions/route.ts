import { z } from "zod";
import { rejectWithoutApiToken } from "@/lib/auth/api-token";
import { createTransaction } from "@/lib/data/transactions";
import { getDb } from "@/lib/db";
import { apiTxnInputSchema, DomainError } from "@/lib/validation";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const denied = rejectWithoutApiToken(req);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }
  const parsed = apiTxnInputSchema.safeParse(body);
  if (!parsed.success) return Response.json({ error: "invalid", issues: z.flattenError(parsed.error).fieldErrors }, { status: 400 });

  try {
    const { id, duplicate } = createTransaction(getDb(), parsed.data, "trading");
    return duplicate ? Response.json({ id, duplicate: true }) : Response.json({ id }, { status: 201 });
  } catch (e) {
    if (e instanceof DomainError) return Response.json({ error: e.message }, { status: 400 });
    throw e;
  }
}
