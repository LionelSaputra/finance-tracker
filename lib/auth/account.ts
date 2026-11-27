import { and, eq, isNull } from "drizzle-orm";
import type { Db } from "../db";
import { settings } from "../db/schema";
import { DomainError } from "../validation";
import { hashPassword, verifyPassword } from "./password";

// APP_PASSWORD_HASH in .env wins over the registered password, so it doubles as the "forgot password" reset.
const envHash = () => process.env.APP_PASSWORD_HASH || null;
const dbHash = (db: Db) => db.select({ h: settings.passwordHash }).from(settings).where(eq(settings.id, 1)).get()?.h ?? null;

export const passwordConfigured = (db: Db) => !!(envHash() || dbHash(db));

export async function checkPassword(db: Db, pw: string): Promise<boolean> {
  const stored = envHash() ?? dbHash(db);
  return !!stored && verifyPassword(pw, stored);
}

/** First-run registration: sets the single password once; refused after that. */
export async function registerPassword(db: Db, pw: string): Promise<void> {
  if (passwordConfigured(db)) throw new DomainError("Akun sudah dibuat");
  if (pw.length < 12) throw new DomainError("Password minimal 12 karakter");
  const hash = await hashPassword(pw);
  // Only fills an empty slot, so two people racing to register cannot both win.
  const res = db
    .update(settings)
    .set({ passwordHash: hash })
    .where(and(eq(settings.id, 1), isNull(settings.passwordHash)))
    .run();
  if (res.changes === 0) throw new DomainError("Akun sudah dibuat");
}
