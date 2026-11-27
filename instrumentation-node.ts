import { dirname, join } from "node:path";
import { runDailyBackup } from "@/lib/backup";
import { todayJakarta } from "@/lib/dates";
import { getDb, getSqlite } from "@/lib/db";
import { migrateDb } from "@/lib/db/migrate";
import { seedDefaults } from "@/lib/db/seed";

migrateDb(getDb());
seedDefaults(getDb());

// Hourly check; a backup is written once per Jakarta day.
const dir = join(dirname(process.env.DATABASE_PATH || "./data/finance.db"), "backups");
const tick = () => runDailyBackup(getSqlite(), dir, todayJakarta()).catch((e: Error) => console.error("Backup gagal:", e.message));
void tick();
setInterval(tick, 60 * 60 * 1000).unref();
