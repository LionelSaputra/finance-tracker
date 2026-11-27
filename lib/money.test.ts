import { describe, expect, it } from "vitest";
import { formatIDR, parseBalance, parseRupiah } from "./money";

describe("parseRupiah", () => {
  it("parses Indonesian thousand separators", () => {
    expect(parseRupiah("1.500.000")).toBe(1_500_000);
    expect(parseRupiah("Rp 25.000")).toBe(25_000);
    expect(parseRupiah("1.500.000,00")).toBe(1_500_000);
    expect(parseRupiah("25000")).toBe(25_000);
  });
  it("rejects decimals, negatives, zero, junk and absurd amounts", () => {
    for (const bad of ["12,5", "-5000", "0", "abc", "", "9999999999999999", "1.50"]) expect(parseRupiah(bad)).toBeNull();
  });
});

describe("parseBalance", () => {
  it("accepts zero and negative balances in the same formats", () => {
    expect(parseBalance("0")).toBe(0);
    expect(parseBalance("Rp 0")).toBe(0);
    expect(parseBalance("-1.500.000")).toBe(-1_500_000);
    expect(parseBalance("2.000.000")).toBe(2_000_000);
  });
  it("rejects junk, decimals and empty input", () => {
    for (const bad of ["", "abc", "12,5", "--5", "9999999999999999"]) expect(parseBalance(bad)).toBeNull();
  });
});

describe("formatIDR", () => {
  it("formats as rupiah without decimals", () => {
    expect(formatIDR(1_500_000).replace(/\s/g, " ")).toBe("Rp 1.500.000");
  });
});
