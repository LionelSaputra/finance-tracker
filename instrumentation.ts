export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { getDb } = await import("@/lib/db");
    const { migrateDb } = await import("@/lib/db/migrate");
    const { seedDefaults } = await import("@/lib/db/seed");
    migrateDb(getDb());
    seedDefaults(getDb());
  }
}
