"use server";

import { revalidatePath } from "next/cache";
import type { ActionState } from "@/lib/action";
import { aiEnabled, requestAiInsight } from "@/lib/ai";
import { requireSession } from "@/lib/auth/session";
import { todayJakarta } from "@/lib/dates";
import { getDb } from "@/lib/db";

export async function askAi(month: string, _prev: ActionState, _fd: FormData): Promise<ActionState> {
  await requireSession();
  if (!aiEnabled()) return { error: "Saran AI belum diaktifkan (ANTHROPIC_API_KEY kosong)." };
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return { error: "Bulan tidak valid" };
  const res = await requestAiInsight(getDb(), month, todayJakarta());
  if (!res.ok) return { error: res.error };
  revalidatePath("/");
  return { ok: "Saran AI diperbarui" };
}
