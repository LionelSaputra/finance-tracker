import { eq } from "drizzle-orm";
import type { Db } from "../db";
import { accounts, categories, settings, transactions } from "../db/schema";
import type { FinanceData } from "../finance";
import { settingsInputSchema, type SettingsInput } from "../validation";

export function loadFinanceData(db: Db): FinanceData {
  return {
    accounts: db.select().from(accounts).all(),
    categories: db.select().from(categories).all(),
    txns: db.select().from(transactions).all(),
    settings: db.select().from(settings).where(eq(settings.id, 1)).get() ?? { id: 1, emergencyMonths: 6 },
  };
}

export function updateSettings(db: Db, input: SettingsInput): void {
  const { emergencyMonths } = settingsInputSchema.parse(input);
  db.insert(settings).values({ id: 1, emergencyMonths }).onConflictDoUpdate({ target: settings.id, set: { emergencyMonths } }).run();
}
