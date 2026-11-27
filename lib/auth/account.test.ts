import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDb, type Db } from "../db";
import { migrateDb } from "../db/migrate";
import { seedDefaults } from "../db/seed";
import { checkPassword, passwordConfigured, registerPassword } from "./account";
import { hashPassword } from "./password";

let db: Db;
beforeEach(() => {
  vi.stubEnv("APP_PASSWORD_HASH", "");
  db = createDb(":memory:");
  migrateDb(db);
  seedDefaults(db);
});
afterEach(() => vi.unstubAllEnvs());

describe("first-run register", () => {
  it("lets the first visitor set the password exactly once", async () => {
    expect(passwordConfigured(db)).toBe(false);
    await registerPassword(db, "rahasia-panjang-1");
    expect(passwordConfigured(db)).toBe(true);
    expect(await checkPassword(db, "rahasia-panjang-1")).toBe(true);
    expect(await checkPassword(db, "salah-panjang-123")).toBe(false);
    await expect(registerPassword(db, "orang-lain-12345")).rejects.toThrow("Akun sudah dibuat");
    expect(await checkPassword(db, "orang-lain-12345")).toBe(false);
  });

  it("rejects short passwords", async () => {
    await expect(registerPassword(db, "pendek")).rejects.toThrow("Password minimal 12 karakter");
    expect(passwordConfigured(db)).toBe(false);
  });

  it("treats APP_PASSWORD_HASH as configured and as the reset path", async () => {
    await registerPassword(db, "rahasia-panjang-1");
    vi.stubEnv("APP_PASSWORD_HASH", await hashPassword("password-reset-99"));
    expect(await checkPassword(db, "password-reset-99")).toBe(true);
    expect(await checkPassword(db, "rahasia-panjang-1")).toBe(false);
  });
});
