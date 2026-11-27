import type { Db } from "./index";
import { categories, settings } from "./schema";

type NewCategory = typeof categories.$inferInsert;

const DEFAULT_CATEGORIES: NewCategory[] = [
  ...["Gaji", "Bonus", "Pemasukan Lain", "Profit Trading"].map((name) => ({ name, kind: "income" as const })),
  ...["Makan", "Transportasi", "Tagihan & Utilitas", "Belanja Rumah", "Kesehatan", "Cicilan"].map((name) => ({
    name,
    kind: "expense" as const,
    group: "needs" as const,
  })),
  ...["Makan di Luar", "Hiburan", "Belanja", "Langganan"].map((name) => ({
    name,
    kind: "expense" as const,
    group: "wants" as const,
  })),
  { name: "Rugi & Biaya Trading", kind: "expense", group: null },
];

export function seedDefaults(db: Db): void {
  // Only on a fresh database: renamed or archived defaults must not come back on every restart.
  if (!db.select({ id: categories.id }).from(categories).limit(1).get()) db.insert(categories).values(DEFAULT_CATEGORIES).run();
  db.insert(settings).values({ id: 1 }).onConflictDoNothing().run();
}
