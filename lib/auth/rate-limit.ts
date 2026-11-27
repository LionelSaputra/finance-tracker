// shortcut: failures live in process memory, so a restart resets them and several instances would not share them;
// fine for one container serving one user — move to SQLite if the app ever runs more than one instance.
// No global cap on purpose: one would let any stranger lock the owner out with 20 wrong guesses an hour.
// Guessing stays impractical through the per-IP limit, the 12-character minimum and scrypt's cost per try.
const IP_WINDOW_MS = 15 * 60e3;
const IP_MAX = 5;

const byIp = new Map<string, number[]>();

function prune(now: number) {
  for (const [ip, times] of byIp) {
    const fresh = times.filter((t) => now - t < IP_WINDOW_MS);
    if (fresh.length) byIp.set(ip, fresh);
    else byIp.delete(ip);
  }
}

export function isLoginBlocked(ip: string, now: number = Date.now()): boolean {
  prune(now);
  return (byIp.get(ip)?.length ?? 0) >= IP_MAX;
}

export function recordLoginFailure(ip: string, now: number = Date.now()): void {
  prune(now);
  byIp.set(ip, [...(byIp.get(ip) ?? []), now]);
}

export function clearLoginFailures(ip: string): void {
  byIp.delete(ip);
}

export function _resetLoginFailures(): void {
  byIp.clear();
}

/** The reverse proxy appends the real client IP last; earlier entries can be forged by the client. */
export function clientIp(h: Headers): string {
  const last = h.get("x-forwarded-for")?.split(",").pop()?.trim();
  return last || "unknown";
}
