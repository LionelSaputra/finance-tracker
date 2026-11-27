"use server";

import { revalidatePath } from "next/cache";
import { formText, guarded, type ActionState } from "@/lib/action";
import { saveAiSettings } from "@/lib/ai";
import { requireSession } from "@/lib/auth/session";
import { archiveCategory, createCategory, updateCategory } from "@/lib/data/categories";
import { loadFinanceData, updateSettings } from "@/lib/data/load";
import { getDb } from "@/lib/db";
import type { Category } from "@/lib/db/schema";
import { DomainError } from "@/lib/validation";

const group = (fd: FormData) => (formText(fd, "group") || null) as Category["group"];

export async function createCategoryAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireSession();
  return guarded(() => {
    const kind = formText(fd, "kind") as Category["kind"];
    createCategory(getDb(), { name: formText(fd, "name"), kind, group: kind === "expense" ? group(fd) : null, monthlyBudget: null });
    revalidatePath("/pengaturan");
  }, "Kategori ditambahkan");
}

export async function updateCategoryAction(id: number, _prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireSession();
  return guarded(() => {
    const c = loadFinanceData(getDb()).categories.find((x) => x.id === id);
    if (!c) throw new DomainError("Kategori tidak ditemukan");
    updateCategory(getDb(), id, { name: formText(fd, "name"), kind: c.kind, group: c.kind === "expense" ? group(fd) : null, monthlyBudget: c.monthlyBudget });
    revalidatePath("/pengaturan");
  });
}

export async function archiveCategoryAction(id: number, _prev: ActionState, _fd: FormData): Promise<ActionState> {
  await requireSession();
  return guarded(() => {
    archiveCategory(getDb(), id);
    revalidatePath("/pengaturan");
  }, "Kategori diarsip");
}

export async function settingsAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireSession();
  return guarded(() => {
    updateSettings(getDb(), { emergencyMonths: Number(formText(fd, "emergencyMonths")) });
    revalidatePath("/pengaturan");
  });
}

export async function aiSettingsAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireSession();
  return guarded(() => {
    // Empty key field keeps the saved key.
    saveAiSettings(getDb(), { apiKey: formText(fd, "apiKey"), model: formText(fd, "model") });
    revalidatePath("/", "layout");
  }, "Pengaturan AI tersimpan");
}

export async function clearAiKeyAction(_prev: ActionState, fd: FormData): Promise<ActionState> {
  await requireSession();
  return guarded(() => {
    saveAiSettings(getDb(), { apiKey: null, model: formText(fd, "model") });
    revalidatePath("/", "layout");
  }, "API key dihapus");
}
