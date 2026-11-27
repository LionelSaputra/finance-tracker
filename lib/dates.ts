// All "today" and month boundaries are computed in Asia/Jakarta, independent of the server TZ.
const jakarta = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" });

const pad = (n: number) => String(n).padStart(2, "0");
const daysIn = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate(); // m is 1-based

export function todayJakarta(now: Date = new Date()): string {
  return jakarta.format(now); // en-CA formats as YYYY-MM-DD
}

export function monthOf(date: string): string {
  return date.slice(0, 7);
}

export function monthRange(month: string): { start: string; end: string } {
  const [y, m] = month.split("-").map(Number);
  return { start: `${month}-01`, end: `${month}-${pad(daysIn(y, m))}` };
}

export function addMonths(month: string, n: number): string {
  const [y, m] = month.split("-").map(Number);
  const total = y * 12 + (m - 1) + n;
  return `${Math.floor(total / 12)}-${pad((total % 12) + 1)}`;
}

export function sameDayLastMonth(date: string): string {
  const prev = addMonths(monthOf(date), -1);
  const [y, m] = prev.split("-").map(Number);
  return `${prev}-${pad(Math.min(Number(date.slice(8, 10)), daysIn(y, m)))}`;
}

export function isValidDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const [y, m, d] = date.split("-").map(Number);
  return m >= 1 && m <= 12 && d >= 1 && d <= daysIn(y, m);
}

export function monthsUntil(from: string, to: string): number {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  const months = (ty - fy) * 12 + (tm - fm) + (td > fd ? 1 : 0);
  return Math.max(1, months);
}
