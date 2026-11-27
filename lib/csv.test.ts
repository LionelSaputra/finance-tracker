import { describe, expect, it } from "vitest";
import { toCsv } from "./csv";

describe("toCsv", () => {
  it("quotes cells with commas, quotes or newlines", () => {
    expect(toCsv([["a,b", 'c"d', 5]])).toBe('"a,b","c""d",5\r\n');
    expect(toCsv([["baris\nbaru"]])).toBe('"baris\nbaru"\r\n');
  });
  it("neutralises cells that a spreadsheet would run as a formula", () => {
    expect(toCsv([["=SUM(A1)"]])).toBe("'=SUM(A1)\r\n");
    expect(toCsv([["+1", "-1", "@x"]])).toBe("'+1,'-1,'@x\r\n");
    expect(toCsv([[-5000]])).toBe("-5000\r\n");
    // Indonesian Excel splits on ";", so a ";=" inside a note must stay inside one quoted cell.
    expect(toCsv([["x;=1+2;"]])).toBe('"x;=1+2;"\r\n');
  });
});
