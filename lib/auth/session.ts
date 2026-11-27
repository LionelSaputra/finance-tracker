import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const SESSION_COOKIE = "fin_session";
export const SESSION_MAX_AGE_S = 30 * 24 * 60 * 60;

const enc = new TextEncoder();
const b64url = (buf: ArrayBuffer) => Buffer.from(buf).toString("base64url");
const key = (secret: string) => crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);

export function sessionSecret(): string {
  const s = process.env.SESSION_SECRET;
  if (!s || s.length < 32) throw new Error("SESSION_SECRET belum diisi (minimal 32 karakter)");
  return s;
}

// Token = "<expiry ms>.<HMAC-SHA256 of expiry>"; nothing else is needed for a single user.
export async function createSessionToken(secret: string, nowMs: number = Date.now()): Promise<string> {
  const exp = String(nowMs + SESSION_MAX_AGE_S * 1000);
  return `${exp}.${b64url(await crypto.subtle.sign("HMAC", await key(secret), enc.encode(exp)))}`;
}

export async function verifySessionToken(token: string, secret: string, nowMs: number = Date.now()): Promise<boolean> {
  const [exp, sig, extra] = token.split(".");
  if (!exp || !sig || extra !== undefined || !/^\d+$/.test(exp) || Number(exp) <= nowMs) return false;
  return crypto.subtle.verify("HMAC", await key(secret), Buffer.from(sig, "base64url"), enc.encode(exp));
}

/** Call first in every page, server action and route handler that needs the user. */
export async function requireSession(): Promise<void> {
  const secret = sessionSecret();
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!token || !(await verifySessionToken(token, secret))) redirect("/login");
}
