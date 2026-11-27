// Plain module (not "use client") so server components get the strings, not client references.
const buttonClass = "inline-flex h-11 items-center justify-center gap-1.5 rounded-md px-4 text-sm font-semibold disabled:opacity-60";
export const primaryButton = `${buttonClass} bg-ink text-paper hover:bg-ink-2`;
export const outlineButton = `${buttonClass} border-[1.5px] border-ink text-ink hover:bg-rule/50`;
export const dangerButton = `${buttonClass} border-[1.5px] border-merah text-merah hover:bg-merah-tint`;
export const inputClass =
  "w-full rounded-md border border-ink/25 bg-sheet px-3 py-2.5 text-base text-ink placeholder:text-ink-3 focus:border-ink focus:outline-none focus-visible:outline-2 focus-visible:outline-marker";
