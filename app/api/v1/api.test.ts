import { beforeAll, describe, expect, it } from "vitest";

const token = "x".repeat(32);
process.env.DATABASE_PATH = ":memory:";
process.env.TRADING_API_TOKEN = token;

type Handler = (req: Request) => Promise<Response>;
let GET_safe: Handler, GET_accounts: Handler, GET_categories: Handler, POST_txn: Handler;
let valid: Record<string, unknown>;

const req = (o: { auth?: string; body?: unknown; rawBody?: string } = {}) =>
  new Request("http://localhost/api/v1/x", {
    method: o.body !== undefined || o.rawBody !== undefined ? "POST" : "GET",
    headers: { ...(o.auth ? { authorization: o.auth } : {}), "content-type": "application/json" },
    body: o.rawBody ?? (o.body !== undefined ? JSON.stringify(o.body) : undefined),
  });
const auth = `Bearer ${token}`;

beforeAll(async () => {
  const { getDb } = await import("@/lib/db");
  const { migrateDb } = await import("@/lib/db/migrate");
  const { seedDefaults } = await import("@/lib/db/seed");
  const { createAccount } = await import("@/lib/data/accounts");
  migrateDb(getDb());
  seedDefaults(getDb());
  const trading = createAccount(getDb(), { name: "Broker", kind: "trading", openingBalance: 0 });
  ({ GET: GET_safe } = await import("./safe-to-trade/route"));
  ({ GET: GET_accounts } = await import("./accounts/route"));
  ({ GET: GET_categories } = await import("./categories/route"));
  ({ POST: POST_txn } = await import("./transactions/route"));
  const cats = await (await GET_categories(req({ auth }))).json();
  const profit = cats.find((c: { name: string }) => c.name === "Profit Trading");
  valid = { externalId: "trade-1", occurredOn: "2026-11-27", type: "income", amount: 150_000, accountId: trading, categoryId: profit.id };
});

describe("trading API", () => {
  it("rejects missing or wrong tokens", async () => {
    expect((await GET_safe(req())).status).toBe(401);
    expect((await GET_safe(req({ auth: "Bearer salah" }))).status).toBe(401);
    expect((await POST_txn(req({ body: valid }))).status).toBe(401);
  });

  it("returns the safe-to-trade amount", async () => {
    const ok = await GET_safe(req({ auth }));
    expect(ok.status).toBe(200);
    const body = await ok.json();
    expect(body).toMatchObject({ currency: "IDR", amount: 0, reason: "belum cukup data" });
    expect(body.breakdown).toHaveProperty("freeCash");
    expect(typeof body.asOf).toBe("string");
  });

  it("records a trading transaction once, even when retried", async () => {
    const first = await POST_txn(req({ auth, body: valid }));
    expect(first.status).toBe(201);
    const { id } = await first.json();
    const dup = await POST_txn(req({ auth, body: valid }));
    expect(dup.status).toBe(200);
    expect(await dup.json()).toEqual({ id, duplicate: true });
    const accounts = await (await GET_accounts(req({ auth }))).json();
    expect(accounts.find((a: { name: string }) => a.name === "Broker")).toMatchObject({ kind: "trading", balance: 150_000 });
  });

  it("explains invalid input", async () => {
    const noId = await POST_txn(req({ auth, body: { ...valid, externalId: undefined } }));
    expect(noId.status).toBe(400);
    expect((await noId.json()).error).toBe("invalid");
    const badJson = await POST_txn(req({ auth, rawBody: "bukan json" }));
    expect(badJson.status).toBe(400);
    expect(await badJson.json()).toEqual({ error: "invalid_json" });
    const wrongCat = await POST_txn(req({ auth, body: { ...valid, externalId: "trade-2", type: "expense" } }));
    expect(await wrongCat.json()).toEqual({ error: "Kategori tidak cocok dengan tipe transaksi" });
  });

  it("is disabled when no token is configured", async () => {
    const { isValidApiToken } = await import("@/lib/auth/api-token");
    expect(isValidApiToken("Bearer abc", undefined)).toBe(false);
    expect(isValidApiToken(`Bearer ${"y".repeat(10)}`, "y".repeat(10))).toBe(false);
    expect(isValidApiToken(auth, token)).toBe(true);
  });
});
