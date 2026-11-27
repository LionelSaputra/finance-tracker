import { existsSync, mkdirSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";
import type Database from "better-sqlite3";

const BACKUP_FILE = /^finance-\d{4}-\d{2}-\d{2}\.db$/;

/** Copies the live database to `dir/finance-<today>.db` once per day and keeps the newest `keep` copies. */
export async function runDailyBackup(sqlite: Database.Database, dir: string, today: string, keep = 14): Promise<string | null> {
  mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `finance-${today}.db`);
  if (existsSync(file)) return null;
  await sqlite.backup(file); // SQLite online backup: consistent even while the app writes
  const old = readdirSync(dir).filter((f) => BACKUP_FILE.test(f)).sort();
  for (const f of old.slice(0, Math.max(0, old.length - keep))) rmSync(path.join(dir, f));
  return file;
}
