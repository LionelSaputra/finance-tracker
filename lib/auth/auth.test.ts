import { beforeEach, describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";
import { _resetLoginFailures, clearLoginFailures, clientIp, isLoginBlocked, recordLoginFailure } from "./rate-limit";
import { createSessionToken, verifySessionToken } from "./session";

describe("password", () => {
  it("verifies the right password only", async () => {
    const h = await hashPassword("benar-panjang-123");
    expect(h).toMatch(/^scrypt:16384:8:1:[\w-]+:[\w-]+$/);
    expect(await verifyPassword("benar-panjang-123", h)).toBe(true);
    expect(await verifyPassword("salah-panjang-123", h)).toBe(false);
  });
  it("returns false for a malformed stored hash", async () => {
    expect(await verifyPassword("x", "bukan-format")).toBe(false);
    expect(await verifyPassword("x", "scrypt:abc:8:1:aa:bb")).toBe(false);
  });
});

describe("session token", () => {
  const s = "s".repeat(32);
  it("is valid for 30 days and only with the same secret", async () => {
    const t = await createSessionToken(s, 0);
    expect(await verifySessionToken(t, s, 1000)).toBe(true);
    expect(await verifySessionToken(t, s, 30 * 864e5 + 1)).toBe(false);
    expect(await verifySessionToken(t + "x", s, 1000)).toBe(false);
    expect(await verifySessionToken(t, "t".repeat(32), 1000)).toBe(false);
    expect(await verifySessionToken("garbage", s, 1000)).toBe(false);
  });
});

describe("login rate limit", () => {
  beforeEach(() => _resetLoginFailures());

  it("blocks an IP after 5 failures for 15 minutes", () => {
    for (let i = 0; i < 4; i++) recordLoginFailure("1.1.1.1", 0);
    expect(isLoginBlocked("1.1.1.1", 1000)).toBe(false);
    recordLoginFailure("1.1.1.1", 0);
    expect(isLoginBlocked("1.1.1.1", 1000)).toBe(true);
    expect(isLoginBlocked("2.2.2.2", 1000)).toBe(false);
    expect(isLoginBlocked("1.1.1.1", 15 * 60e3 + 1)).toBe(false);
  });

  it("clears an IP after a successful login", () => {
    for (let i = 0; i < 5; i++) recordLoginFailure("1.1.1.1", 0);
    clearLoginFailures("1.1.1.1");
    expect(isLoginBlocked("1.1.1.1", 1000)).toBe(false);
  });

  it("never lets failures from other IPs lock the owner out", () => {
    for (let i = 0; i < 200; i++) recordLoginFailure(`10.0.${Math.floor(i / 5)}.${i % 5}`, 0);
    expect(isLoginBlocked("9.9.9.9", 1000)).toBe(false);
  });

  it("takes the client IP from the right-most X-Forwarded-For entry", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "1.1.1.1, 2.2.2.2" }))).toBe("2.2.2.2");
    expect(clientIp(new Headers())).toBe("unknown");
  });
});
