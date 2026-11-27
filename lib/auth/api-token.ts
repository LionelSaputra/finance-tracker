import { createHash, timingSafeEqual } from "node:crypto";

const digest = (s: string) => createHash("sha256").update(s).digest();

export function isValidApiToken(authHeader: string | null, expected: string | undefined): boolean {
  if (!expected || expected.length < 32 || !authHeader?.startsWith("Bearer ")) return false;
  return timingSafeEqual(digest(authHeader.slice(7)), digest(expected));
}

/** Returns a 401 response when the request lacks the trading token, otherwise null. Call before reading the body. */
export function rejectWithoutApiToken(req: Request): Response | null {
  return isValidApiToken(req.headers.get("authorization"), process.env.TRADING_API_TOKEN)
    ? null
    : Response.json({ error: "unauthorized" }, { status: 401 });
}
