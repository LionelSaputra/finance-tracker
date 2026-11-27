"use client";

import { useEffect, useRef, useState } from "react";
import { parseRupiah } from "@/lib/money";

const plain = new Intl.NumberFormat("id-ID");

/** Numeric keypad on phones; adds thousand separators on blur, but never rewrites input it cannot parse (e.g. "12,5"). */
export function AmountInput({ defaultValue, className, autoFocus }: { defaultValue?: number; className?: string; autoFocus?: boolean }) {
  const initial = defaultValue ? plain.format(defaultValue) : "";
  const [value, setValue] = useState(initial);
  const ref = useRef<HTMLInputElement>(null);
  // A controlled input ignores form.reset(); follow it, so "add" forms really empty after a save.
  useEffect(() => {
    const form = ref.current?.form;
    const onReset = () => setValue(initial);
    form?.addEventListener("reset", onReset);
    return () => form?.removeEventListener("reset", onReset);
  }, [initial]);
  return (
    <input
      ref={ref}
      name="amount"
      inputMode="numeric"
      autoComplete="off"
      placeholder="0"
      required
      autoFocus={autoFocus}
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => {
        const n = parseRupiah(value);
        if (n != null) setValue(plain.format(n));
      }}
      className={className}
      aria-label="Nominal"
    />
  );
}
