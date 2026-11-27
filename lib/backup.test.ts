import { mkdtempSync, readdirSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { beforeEach, describe, expect, it } from "vitest";
import { runDailyBackup } from "./backup";
import { createDb } from "./db";
import { migrateDb } from "./db/migrate";

let sqlite: Database.Database;
let dir: string;

beforeEach(() => {
  const db = createDb(":memory:");
  migrateDb(db);
  sqlite = db.$client;
  dir = mkdtempSync(path.join(tmpdir(), "finance-backup-"));
});

describe("runDailyBackup", () => {
  it("writes one readable copy per day", async () => {
    const file = await runDailyBackup(sqlite, dir, "2026-11-27");
    expect(path.basename(file!)).toBe("finance-2026-11-27.db");
    const copy = new Database(file!, { readonly: true });
    expect(copy.prepare("select name from sqlite_master where name = 'transactions'").get()).toBeTruthy();
    copy.close();
    expect(await runDailyBackup(sqlite, dir, "2026-11-27")).toBeNull();
  });

  it("recovers from a backup that died half-way", async () => {
    // A crashed run leaves only a partial .tmp, which must neither block the day nor survive.
    writeFileSync(path.join(dir, "finance-2026-11-27.db.tmp"), "half a backup");
    const file = await runDailyBackup(sqlite, dir, "2026-11-27");
    expect(file && new Database(file, { readonly: true }).prepare("select 1 as ok").get()).toEqual({ ok: 1 });
    expect(readdirSync(dir)).not.toContain("finance-2026-11-27.db.tmp");
  });

  it("keeps only the newest 14 backups", async () => {
    for (let d = 1; d <= 15; d++) writeFileSync(path.join(dir, `finance-2026-10-${String(d).padStart(2, "0")}.db`), "");
    writeFileSync(path.join(dir, "catatan.txt"), "bukan backup");
    await runDailyBackup(sqlite, dir, "2026-11-27");
    const files = readdirSync(dir).filter((f) => f.endsWith(".db")).sort();
    expect(files).toHaveLength(14);
    expect(files[0]).toBe("finance-2026-10-03.db");
    expect(files.at(-1)).toBe("finance-2026-11-27.db");
    expect(readdirSync(dir)).toContain("catatan.txt");
  });
});
