"use server";

import { revalidatePath } from "next/cache";
import { guarded, type ActionState } from "@/lib/action";
import { aiEnabled, requestAiInsight } from "@/lib/ai";
import { requireSession } from "@/lib/auth/session";
import { todayJakarta } from "@/lib/dates";
import { getDb } from "@/lib/db";
import { handleRecurring } from "@/lib/data/recurring";

export async function askAi(month: string, _prev: ActionState, _fd: FormData): Promise<ActionState> {
  await requireSession();
  if (!aiEnabled(getDb())) return { error: "Saran AI belum diaktifkan. Isi API key di Pengaturan." };
  if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) return { error: "Bulan tidak valid" };
  const res = await requestAiInsight(getDb(), month, todayJakarta());
  if (!res.ok) return { error: res.error };
  revalidatePath("/");
  return { ok: "Saran AI diperbarui" };
}

export async function handleRecurringAction(id: number, action: "post" | "skip", _prev: ActionState, _fd: FormData): Promise<ActionState> {
  await requireSession();
  return guarded(() => {
    handleRecurring(getDb(), id, todayJakarta(), action === "post" ? "post" : "skip");
    revalidatePath("/", "layout");
  }, action === "post" ? "Tercatat" : "Dilewati bulan ini");
}
