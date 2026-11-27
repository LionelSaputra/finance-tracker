import type { Suggestion } from "@/lib/suggestions";

const STYLE: Record<Suggestion["level"], string> = {
  alert: "border-red-200 bg-red-50 text-red-800",
  warn: "border-amber-200 bg-amber-50 text-amber-900",
  info: "border-slate-200 bg-white text-slate-700",
};
const ICON: Record<Suggestion["level"], string> = { alert: "⚠", warn: "↑", info: "•" };

export function SuggestionList({ items }: { items: Suggestion[] }) {
  if (!items.length) return <p className="text-sm text-slate-600">Belum ada saran. Keuanganmu bulan ini terlihat aman.</p>;
  return (
    <ul className="space-y-2">
      {items.map((s) => (
        <li key={s.text} className={`flex gap-2 rounded-lg border px-3 py-2 text-sm ${STYLE[s.level]}`}>
          <span aria-hidden>{ICON[s.level]}</span>
          <span>{s.text}</span>
        </li>
      ))}
    </ul>
  );
}
