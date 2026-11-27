// Text cells starting with = + - @ get a leading ' so Excel/Sheets show them as text instead of running a formula.
const cell = (v: string | number) => {
  if (typeof v === "number") return String(v);
  const safe = /^[=+\-@]/.test(v) ? `'${v}` : v;
  return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export function toCsv(rows: (string | number)[][]): string {
  return rows.map((r) => r.map(cell).join(",") + "\r\n").join("");
}
