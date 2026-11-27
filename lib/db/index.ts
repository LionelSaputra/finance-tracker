import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";

export function createDb(path: string) {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });
  const sqlite = new Database(path);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");
  return drizzle(sqlite, { schema });
}

export type Db = ReturnType<typeof createDb>;

// Kept on globalThis so `next dev` hot reloads reuse one connection.
const g = globalThis as unknown as { __financeDb?: Db };

export function getDb(): Db {
  g.__financeDb ??= createDb(process.env.DATABASE_PATH || "./data/finance.db");
  return g.__financeDb;
}

export function getSqlite(): Database.Database {
  return getDb().$client;
}
