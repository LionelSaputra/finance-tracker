// shortcut: failures live in process memory, so a restart resets them and several instances would not share them;
// fine for one container serving one user — move to SQLite if the app ever runs more than one instance.
const IP_WINDOW_MS = 15 * 60e3;
const IP_MAX = 5;
const GLOBAL_WINDOW_MS = 60 * 60e3;
const GLOBAL_MAX = 20;

const byIp = new Map<string, number[]>();
let global: number[] = [];

function prune(now: number) {
  global = global.filter((t) => now - t < GLOBAL_WINDOW_MS);
  for (const [ip, times] of byIp) {
    const fresh = times.filter((t) => now - t < IP_WINDOW_MS);
    if (fresh.length) byIp.set(ip, fresh);
    else byIp.delete(ip);
  }
}

export function isLoginBlocked(ip: string, now: number = Date.now()): boolean {
  prune(now);
  return global.length >= GLOBAL_MAX || (byIp.get(ip)?.length ?? 0) >= IP_MAX;
}

export function recordLoginFailure(ip: string, now: number = Date.now()): void {
  prune(now);
  global.push(now);
  byIp.set(ip, [...(byIp.get(ip) ?? []), now]);
}

export function clearLoginFailures(ip: string): void {
  byIp.delete(ip);
}

export function _resetLoginFailures(): void {
  byIp.clear();
  global = [];
}

/** The reverse proxy appends the real client IP last; earlier entries can be forged by the client. */
export function clientIp(h: Headers): string {
  const last = h.get("x-forwarded-for")?.split(",").pop()?.trim();
  return last || "unknown";
}
