import { expect, it } from "vitest";
import { dateLabel, monthLabel, shortIDR, timeWIB } from "./labels";

it("formats dates, compact amounts and WIB times the Indonesian way", () => {
  expect(monthLabel("2026-11")).toBe("November 2026");
  expect(dateLabel("2027-06-30")).toBe("30 Jun 2027");
  expect([shortIDR(375_000), shortIDR(999_600), shortIDR(1_250_000), shortIDR(2_000_000)]).toEqual(["375rb", "1jt", "1,3jt", "2jt"]);
  expect(timeWIB("2026-11-27 12:40:00")).toBe("19.40");
});
