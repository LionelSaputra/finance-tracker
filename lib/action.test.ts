import { describe, expect, it } from "vitest";
import { guarded } from "./action";
import { DomainError, txnInputSchema } from "./validation";

describe("guarded", () => {
  it("returns the success message", async () => {
    expect(await guarded(() => {}, "Tersimpan")).toEqual({ ok: "Tersimpan" });
  });
  it("turns rule violations into messages", async () => {
    expect(await guarded(() => { throw new DomainError("Akun sudah diarsip"); })).toEqual({ error: "Akun sudah diarsip" });
  });
  it("names the invalid field in Indonesian", async () => {
    const res = await guarded(() => { txnInputSchema.parse({ occurredOn: "2026-11-27", type: "expense", amount: 0, accountId: 1 }); });
    expect(res).toEqual({ error: "Periksa isian: Nominal" });
  });
  it("rethrows unexpected errors (and redirects)", async () => {
    await expect(guarded(() => { throw new Error("boom"); })).rejects.toThrow("boom");
  });
});
