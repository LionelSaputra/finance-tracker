"use client";

import { useState } from "react";

const OPTIONS = [
  { v: "auto", label: "Ikuti perangkat" },
  { v: "light", label: "Terang" },
  { v: "dark", label: "Gelap" },
] as const;

function applyTheme(v: string) {
  const root = document.documentElement;
  if (v === "auto") {
    root.removeAttribute("data-theme");
    document.cookie = "theme=; path=/; max-age=0; samesite=lax";
  } else {
    root.setAttribute("data-theme", v);
    document.cookie = `theme=${v}; path=/; max-age=${60 * 60 * 24 * 365 * 5}; samesite=lax`;
  }
}

/** Switches the theme the moment an option is tapped; the cookie lets the server render the same theme next time (no flash). */
export function ThemePicker({ initial }: { initial: string }) {
  const [theme, setTheme] = useState(initial);
  const choose = (v: string) => {
    setTheme(v);
    applyTheme(v);
  };
  return (
    <fieldset className="grid grid-cols-3 border-[1.5px] border-ink">
      <legend className="sr-only">Tema</legend>
      {OPTIONS.map((o) => (
        <label
          key={o.v}
          className={`cursor-pointer text-center text-sm font-semibold has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-marker ${theme === o.v ? "bg-ink text-paper" : "text-ink-2"}`}
        >
          <input type="radio" name="theme" value={o.v} checked={theme === o.v} onChange={() => choose(o.v)} className="sr-only" />
          <span className="block px-2 py-2.5">{o.label}</span>
        </label>
      ))}
    </fieldset>
  );
}
