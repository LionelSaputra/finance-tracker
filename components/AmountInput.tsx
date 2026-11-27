"use client";

import { useState } from "react";
import { parseRupiah } from "@/lib/money";

const plain = new Intl.NumberFormat("id-ID");

/** Numeric keypad on phones; adds thousand separators on blur, but never rewrites input it cannot parse (e.g. "12,5"). */
export function AmountInput({ defaultValue, className }: { defaultValue?: number; className?: string }) {
  const [value, setValue] = useState(defaultValue ? plain.format(defaultValue) : "");
  return (
    <input
      name="amount"
      inputMode="numeric"
      autoComplete="off"
      placeholder="0"
      required
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
