import type { Suggestion } from "@/lib/suggestions";
import { Icon, type IconName } from "./Icon";

const STYLE: Record<Suggestion["level"], { icon: IconName; tone: string; sr: string }> = {
  alert: { icon: "alert", tone: "text-merah", sr: "Lewat:" },
  warn: { icon: "rise", tone: "text-mepet", sr: "Perhatian:" },
  info: { icon: "info", tone: "text-ink-3", sr: "Info:" },
};

function Item({ s }: { s: Suggestion }) {
  const st = STYLE[s.level];
  return (
    <li className="flex gap-2.5 py-2.5 text-sm">
      <Icon name={st.icon} size={18} className={`mt-0.5 shrink-0 ${st.tone}`} />
      <span>
        <span className="sr-only">{st.sr} </span>
        {s.text}
      </span>
    </li>
  );
}

/** At most three, most urgent first; the rest wait behind one tap. */
export function SuggestionList({ items }: { items: Suggestion[] }) {
  if (!items.length) return <p className="text-sm text-ink-2">Belum ada saran untuk bulan ini.</p>;
  const [shown, rest] = [items.slice(0, 3), items.slice(3)];
  return (
    <div>
      <ul className="divide-y divide-rule">
        {shown.map((s) => (
          <Item key={s.text} s={s} />
        ))}
      </ul>
      {rest.length > 0 && (
        <details>
          <summary className="cursor-pointer list-none py-2 text-sm font-semibold text-ink-2 underline">Lihat semua ({items.length})</summary>
          <ul className="divide-y divide-rule">
            {rest.map((s) => (
              <Item key={s.text} s={s} />
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
