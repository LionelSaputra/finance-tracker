export const MAX_AMOUNT = 1_000_000_000_000;

const idr = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

// Accepts "25000", "1.500.000", "Rp 1.500.000,00". Anything else (decimals, minus, junk) is rejected,
// so "12,5" can never silently become 125.
export function parseRupiah(input: string): number | null {
  const s = input.trim().replace(/^rp\.?\s*/i, "").replace(/\s/g, "");
  if (!/^(\d+|\d{1,3}(\.\d{3})+)(,0{1,2})?$/.test(s)) return null;
  const n = Number(s.replace(/,0+$/, "").replace(/\./g, ""));
  return n >= 1 && n <= MAX_AMOUNT ? n : null;
}

/** Like parseRupiah, but for balances: allows 0 and a leading minus (e.g. a credit card). */
export function parseBalance(input: string): number | null {
  const s = input.trim().replace(/^rp\.?\s*/i, "");
  const negative = s.startsWith("-");
  const body = negative ? s.slice(1) : s;
  if (/^0+(,0{1,2})?$/.test(body.replace(/\s/g, ""))) return 0;
  const n = parseRupiah(body);
  return n == null ? null : negative ? -n : n;
}

export function formatIDR(amount: number): string {
  return idr.format(amount);
}
