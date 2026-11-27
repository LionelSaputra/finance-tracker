export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { dirname, join } = await import("node:path");
  const { getDb, getSqlite } = await import("@/lib/db");
  const { migrateDb } = await import("@/lib/db/migrate");
  const { seedDefaults } = await import("@/lib/db/seed");
  const { runDailyBackup } = await import("@/lib/backup");
  const { todayJakarta } = await import("@/lib/dates");

  migrateDb(getDb());
  seedDefaults(getDb());

  // Hourly check; a backup is written once per Jakarta day.
  const dir = join(dirname(process.env.DATABASE_PATH || "./data/finance.db"), "backups");
  const tick = () => runDailyBackup(getSqlite(), dir, todayJakarta()).catch((e: Error) => console.error("Backup gagal:", e.message));
  void tick();
  setInterval(tick, 60 * 60 * 1000).unref();
}
