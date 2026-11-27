import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildAiSummary, latestAiInsight, requestAiInsight, type AiClient } from "./ai";
import { adjustBalance, createAccount } from "./data/accounts";
import { loadFinanceData } from "./data/load";
import { createTransaction } from "./data/transactions";
import { createDb, type Db } from "./db";
import { migrateDb } from "./db/migrate";
import { seedDefaults } from "./db/seed";
import { computeSnapshot } from "./finance";

let db: Db;

const goodText = JSON.stringify({
  ringkasan: "Pengeluaran bulan ini terkendali.",
  saran: [{ judul: "Tambah dana darurat", detail: "Sisihkan Rp 500.000 ke Darurat.", prioritas: "tinggi" }],
});
const reply = (over: Record<string, unknown> = {}) => ({
  model: "claude-opus-5-5",
  stop_reason: "end_turn",
  content: [{ type: "text", text: goodText }],
  usage: { input_tokens: 900, output_tokens: 300 },
  ...over,
});
const fakeClient = (impl: () => Promise<unknown>) => {
  const create = vi.fn((_params: Record<string, unknown>) => impl());
  return { client: { beta: { messages: { create } } } as unknown as AiClient, create };
};

beforeEach(() => {
  db = createDb(":memory:");
  migrateDb(db);
  seedDefaults(db);
  const bca = createAccount(db, { name: "BCA Utama", kind: "spending", openingBalance: 5_000_000 });
  const makan = loadFinanceData(db).categories.find((c) => c.name === "Makan")!.id;
  createTransaction(db, { occurredOn: "2026-11-10", type: "expense", amount: 200_000, accountId: bca, categoryId: makan, note: "catatan-rahasia" });
  adjustBalance(db, bca, 4_800_000);
});
afterEach(() => vi.unstubAllEnvs());

describe("buildAiSummary", () => {
  it("sends numbers and category names, never notes or account names", () => {
    const json = JSON.stringify(buildAiSummary(computeSnapshot(loadFinanceData(db), "2026-11", "2026-11-27"), []));
    expect(json).not.toContain("catatan-rahasia");
    expect(json).not.toContain("BCA Utama");
    expect(json).toContain("Makan");
    expect(json).toContain("200000");
  });
});

describe("requestAiInsight", () => {
  it("stores and returns a valid answer", async () => {
    const { client } = fakeClient(async () => reply());
    const res = await requestAiInsight(db, "2026-11", "2026-11-27", client);
    expect(res).toMatchObject({ ok: true, insight: { ringkasan: "Pengeluaran bulan ini terkendali.", model: "claude-opus-5-5" } });
    expect(latestAiInsight(db, "2026-11")?.saran).toHaveLength(1);
    expect(latestAiInsight(db, "2026-10")).toBeNull();
  });

  it("explains a refusal", async () => {
    const { client } = fakeClient(async () => reply({ stop_reason: "refusal", content: [] }));
    expect(await requestAiInsight(db, "2026-11", "2026-11-27", client)).toEqual({ ok: false, error: "AI tidak bisa memberi saran untuk data ini." });
  });

  it("rejects an answer that does not match the schema", async () => {
    const { client } = fakeClient(async () => reply({ content: [{ type: "text", text: "{\"halo\":1}" }] }));
    expect(await requestAiInsight(db, "2026-11", "2026-11-27", client)).toEqual({ ok: false, error: "Jawaban AI tidak terbaca, coba lagi." });
  });

  it("reports a failed request without crashing", async () => {
    const { client } = fakeClient(async () => {
      throw new Error("network down");
    });
    expect(await requestAiInsight(db, "2026-11", "2026-11-27", client)).toEqual({ ok: false, error: "Gagal menghubungi AI, coba lagi nanti." });
    expect(latestAiInsight(db, "2026-11")).toBeNull();
  });

  it("asks for server-side fallbacks on Opus but not on Haiku", async () => {
    vi.stubEnv("AI_MODEL", "claude-opus-5-5");
    const opus = fakeClient(async () => reply());
    await requestAiInsight(db, "2026-11", "2026-11-27", opus.client);
    expect(opus.create.mock.calls[0][0]).toMatchObject({ model: "claude-opus-5-5", fallbacks: "default", betas: ["server-side-fallback-2026-07-01"] });

    vi.stubEnv("AI_MODEL", "claude-haiku-5-5");
    const haiku = fakeClient(async () => reply({ model: "claude-haiku-5-5" }));
    await requestAiInsight(db, "2026-11", "2026-11-27", haiku.client);
    const params = haiku.create.mock.calls[0][0];
    expect(params.model).toBe("claude-haiku-5-5");
    expect(params).not.toHaveProperty("fallbacks");
  });
});
