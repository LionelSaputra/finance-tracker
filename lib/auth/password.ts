import { randomBytes, scrypt, timingSafeEqual, type BinaryLike, type ScryptOptions } from "node:crypto";

const N = 16384;
const R = 8;
const P = 1;
const KEYLEN = 32;

const derive = (pw: BinaryLike, salt: Buffer, opts: ScryptOptions) =>
  new Promise<Buffer>((resolve, reject) => scrypt(pw, salt, KEYLEN, opts, (err, key) => (err ? reject(err) : resolve(key))));

// Format "scrypt:N:r:p:salt:hash" (base64url) — no "$", so it is safe in a Docker .env file.
export async function hashPassword(pw: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await derive(pw, salt, { N, r: R, p: P });
  return `scrypt:${N}:${R}:${P}:${salt.toString("base64url")}:${key.toString("base64url")}`;
}

export async function verifyPassword(pw: string, stored: string): Promise<boolean> {
  const [algo, n, r, p, salt, hash] = stored.split(":");
  const params = [n, r, p].map(Number);
  if (algo !== "scrypt" || !salt || !hash || params.some((x) => !Number.isInteger(x) || x <= 0)) return false;
  try {
    const expected = Buffer.from(hash, "base64url");
    const key = await derive(pw, Buffer.from(salt, "base64url"), { N: params[0], r: params[1], p: params[2] });
    return key.length === expected.length && timingSafeEqual(key, expected);
  } catch {
    return false;
  }
}
