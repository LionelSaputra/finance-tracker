import Anthropic from "@anthropic-ai/sdk";
import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { loadFinanceData } from "./data/load";
import type { Db } from "./db";
import { aiInsights } from "./db/schema";
import { computeSnapshot, type FinanceSnapshot } from "./finance";
import { ruleSuggestions, type Suggestion } from "./suggestions";

export const aiResultSchema = z.object({
  ringkasan: z.string().min(1),
  saran: z
    .array(z.object({ judul: z.string().min(1), detail: z.string().min(1), prioritas: z.enum(["tinggi", "sedang", "rendah"]) }))
    .min(1)
    .transform((s) => s.slice(0, 6)),
});
export type AiInsight = z.infer<typeof aiResultSchema> & { createdAt: string; model: string };
export type AiSummary = ReturnType<typeof buildAiSummary>;
export type AiClient = { beta: { messages: { create: (p: Anthropic.Beta.Messages.MessageCreateParamsNonStreaming) => Promise<Anthropic.Beta.Messages.BetaMessage> } } };

// Plain JSON schema for structured output; size limits are enforced by aiResultSchema afterwards.
const RESULT_JSON_SCHEMA = {
  type: "object",
  properties: {
    ringkasan: { type: "string" },
    saran: {
      type: "array",
      items: {
        type: "object",
        properties: { judul: { type: "string" }, detail: { type: "string" }, prioritas: { type: "string", enum: ["tinggi", "sedang", "rendah"] } },
        required: ["judul", "detail", "prioritas"],
        additionalProperties: false,
      },
    },
  },
  required: ["ringkasan", "saran"],
  additionalProperties: false,
};

const SYSTEM_PROMPT = `Kamu asisten keuangan pribadi untuk satu orang di Indonesia. Kamu menerima ringkasan angka keuangan satu bulan (Rupiah, bilangan bulat) dari aplikasi pencatat keuangannya.

Beri 3 sampai 6 saran yang konkret dan bisa langsung dilakukan bulan ini, berdasarkan angka yang diberikan: pola pengeluaran per kategori dibanding bulan lalu, budget, pembagian 50/30/20, dana darurat, target tabungan, dan berapa porsi dana yang wajar untuk trading. Sebutkan angka Rupiah dari data bila relevan.

Jangan merekomendasikan saham, kripto, reksa dana, atau aset tertentu, dan jangan menjanjikan hasil investasi. Kalau data kurang untuk menilai sesuatu, katakan data apa yang perlu dicatat.

Tulis dalam Bahasa Indonesia yang singkat dan ramah. "ringkasan" berisi 1-2 kalimat gambaran umum bulan ini.`;

export const aiEnabled = () => !!process.env.ANTHROPIC_API_KEY;
const aiModel = () => process.env.AI_MODEL || "claude-opus-5-5";
// Server-side refusal fallback exists for Opus/Sonnet; Haiku has none.
const supportsFallback = (model: string) => /^claude-(opus|sonnet|fable)/.test(model);

/** The only data that leaves the server: aggregates, category and goal names — no notes, no account names. */
export function buildAiSummary(s: FinanceSnapshot, rules: Suggestion[]) {
  return {
    bulan: s.month,
    pemasukan: s.income,
    pengeluaran: s.expense,
    kategori: s.categories
      .filter((c) => c.current > 0 || c.previous > 0 || c.budget != null)
      .map((c) => ({ nama: c.name, jenis: c.kind, kelompok: c.group, bulanIni: c.current, periodeSamaBulanLalu: c.previous, budget: c.budget })),
    pembagian503020: s.split,
    rataRataPengeluaranBulanan: s.avgMonthlyExpense,
    danaDarurat: s.emergency && { targetBulan: s.emergency.months, target: s.emergency.target, saatIni: s.emergency.current, kekurangan: s.emergency.gap },
    targetTabungan: s.goals.map((g) => ({ nama: g.name, target: g.target, saldo: g.balance, tanggalTarget: g.targetDate, setoranPerBulan: g.neededPerMonth })),
    danaAmanTrading: {
      jumlah: s.safeToTrade.amount,
      saldoHarian: s.safeToTrade.freeCash,
      sisaBudget: s.safeToTrade.remainingBudget,
      kekuranganDanaDarurat: s.safeToTrade.emergencyGap,
      alasan: s.safeToTrade.reason,
    },
    hasilTradingBulanIni: s.tradingResult,
    saranAturan: rules.map((r) => r.text),
  };
}

export async function requestAiInsight(
  db: Db,
  month: string,
  today: string,
  client: AiClient = new Anthropic(),
): Promise<{ ok: true; insight: AiInsight } | { ok: false; error: string }> {
  const snap = computeSnapshot(loadFinanceData(db), month, today);
  const summary = buildAiSummary(snap, ruleSuggestions(snap));
  const model = aiModel();

  let res: Anthropic.Beta.Messages.BetaMessage;
  try {
    res = await client.beta.messages.create({
      model,
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: `Ringkasan keuangan:\n${JSON.stringify(summary)}` }],
      output_config: { effort: "medium", format: { type: "json_schema", schema: RESULT_JSON_SCHEMA } },
      ...(supportsFallback(model) ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
    });
  } catch (e) {
    // Status only: never log the summary or the key.
    console.error("AI request failed:", e instanceof Anthropic.APIError ? e.status : (e as Error).name);
    return { ok: false, error: "Gagal menghubungi AI, coba lagi nanti." };
  }

  if (res.stop_reason === "refusal") return { ok: false, error: "AI tidak bisa memberi saran untuk data ini." };
  const text = res.content.find((b) => b.type === "text");
  let parsed: z.infer<typeof aiResultSchema> | null = null;
  try {
    const r = aiResultSchema.safeParse(JSON.parse(text && "text" in text ? text.text : ""));
    parsed = r.success ? r.data : null;
  } catch {
    parsed = null;
  }
  if (!parsed) return { ok: false, error: "Jawaban AI tidak terbaca, coba lagi." };

  const row = db
    .insert(aiInsights)
    .values({
      month,
      model: res.model,
      summaryJson: JSON.stringify(summary),
      resultJson: JSON.stringify(parsed),
      inputTokens: res.usage.input_tokens,
      outputTokens: res.usage.output_tokens,
    })
    .returning({ createdAt: aiInsights.createdAt })
    .get();
  return { ok: true, insight: { ...parsed, createdAt: row.createdAt, model: res.model } };
}

export function latestAiInsight(db: Db, month: string): AiInsight | null {
  const row = db.select().from(aiInsights).where(eq(aiInsights.month, month)).orderBy(desc(aiInsights.id)).limit(1).get();
  if (!row) return null;
  const r = aiResultSchema.safeParse(JSON.parse(row.resultJson));
  return r.success ? { ...r.data, createdAt: row.createdAt, model: row.model } : null;
}
