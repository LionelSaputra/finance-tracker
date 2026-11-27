import { join } from "node:path";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import type { Db } from "./index";

export function migrateDb(db: Db): void {
  migrate(db, { migrationsFolder: join(process.cwd(), "drizzle") });
}
