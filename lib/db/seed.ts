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
  db.insert(categories).values(DEFAULT_CATEGORIES).onConflictDoNothing().run();
  db.insert(settings).values({ id: 1 }).onConflictDoNothing().run();
}
