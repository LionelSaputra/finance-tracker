const PATHS = {
  settings: "M4 7h10M18 7h2M4 17h4M12 17h8M16 5v4M10 15v4",
  "chevron-left": "M15 5l-7 7 7 7",
  "chevron-right": "M9 5l7 7-7 7",
  arrow: "M5 12h14M13 6l6 6-6 6",
  home: "M4 11l8-7 8 7v9h-5v-6h-6v6H4z",
  list: "M5 7h14M5 12h14M5 17h9",
  budget: "M12 3a9 9 0 1 0 9 9h-9z",
  wallet: "M3 7.5A1.5 1.5 0 0 1 4.5 6h15A1.5 1.5 0 0 1 21 7.5v10a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 17.5zM16 12.5h2",
  plus: "M12 5v14M5 12h14",
  alert: "M12 4l9 16H3zM12 10v4M12 17v.5",
  rise: "M4 17l6-6 4 4 6-7M15 8h5v5",
  info: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v5M12 8v.5",
} as const;

export type IconName = keyof typeof PATHS;

/** One stroke family for the whole app; decorative unless a label is given. */
export function Icon({ name, size = 24, label, className }: { name: IconName; size?: number; label?: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
