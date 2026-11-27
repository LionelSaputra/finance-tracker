import { describe, expect, it } from "vitest";
import { addMonths, isValidDate, monthOf, monthRange, monthsUntil, sameDayLastMonth, todayJakarta } from "./dates";

describe("dates", () => {
  it("uses Jakarta time for today", () => {
    expect(todayJakarta(new Date("2026-11-30T18:00:00Z"))).toBe("2026-12-01");
    expect(todayJakarta(new Date("2026-11-30T16:59:59Z"))).toBe("2026-11-30");
  });
  it("clamps same day last month to month length", () => {
    expect(sameDayLastMonth("2026-03-31")).toBe("2026-02-28");
    expect(sameDayLastMonth("2028-03-31")).toBe("2028-02-29");
    expect(sameDayLastMonth("2026-01-15")).toBe("2025-12-15");
  });
  it("computes month ranges and offsets", () => {
    expect(monthRange("2026-02")).toEqual({ start: "2026-02-01", end: "2026-02-28" });
    expect(addMonths("2026-01", -1)).toBe("2025-12");
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(monthOf("2026-11-27")).toBe("2026-11");
  });
  it("rejects impossible dates", () => {
    expect(isValidDate("2026-02-30")).toBe(false);
    expect(isValidDate("2026-2-3")).toBe(false);
    expect(isValidDate("2028-02-29")).toBe(true);
  });
  it("counts months until a target date, at least 1", () => {
    expect(monthsUntil("2026-11-27", "2027-05-27")).toBe(6);
    expect(monthsUntil("2026-11-27", "2027-05-28")).toBe(7);
    expect(monthsUntil("2026-11-27", "2026-11-01")).toBe(1);
  });
});
