import { z } from "zod";
import { isValidDate } from "./dates";
import { MAX_AMOUNT } from "./money";

/** A rule violation the user can fix; its message is shown as-is in the UI and the API. */
export class DomainError extends Error {}

const id = z.number().int().positive();
const date = z.string().refine(isValidDate, "Tanggal tidak valid");
const name = z.string().trim().min(1).max(50);

export const txnInputSchema = z.object({
  occurredOn: date,
  type: z.enum(["income", "expense", "transfer"]),
  amount: z.number().int().min(1).max(MAX_AMOUNT),
  accountId: id,
  toAccountId: id.nullish(),
  categoryId: id.nullish(),
  note: z.string().max(500).nullish(),
  externalId: z.string().min(1).max(100).nullish(),
});
export const apiTxnInputSchema = txnInputSchema.extend({ externalId: z.string().min(1).max(100) });
export type TxnInput = z.input<typeof txnInputSchema>;

export const accountInputSchema = z.object({
  name,
  kind: z.enum(["spending", "savings", "emergency", "trading"]),
  openingBalance: z.number().int().min(-MAX_AMOUNT).max(MAX_AMOUNT),
  targetAmount: z.number().int().min(1).max(MAX_AMOUNT).nullish(),
  targetDate: date.nullish(),
});
export type AccountInput = z.input<typeof accountInputSchema>;

export const categoryInputSchema = z
  .object({
    name,
    kind: z.enum(["income", "expense"]),
    group: z.enum(["needs", "wants"]).nullish(),
    monthlyBudget: z.number().int().min(0).max(MAX_AMOUNT).nullish(),
  })
  .refine((c) => c.kind === "expense" || c.group == null, { message: "Kategori pemasukan tidak memakai group", path: ["group"] });
export type CategoryInput = z.input<typeof categoryInputSchema>;

export const settingsInputSchema = z.object({ emergencyMonths: z.number().int().min(1).max(24) });
export type SettingsInput = z.input<typeof settingsInputSchema>;
