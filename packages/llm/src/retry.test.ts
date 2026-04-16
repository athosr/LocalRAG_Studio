import { describe, expect, it } from "vitest";
import { withRetries } from "./retry.js";

describe("withRetries", () => {
  it("returns first success", async () => {
    let n = 0;
    const v = await withRetries(
      async () => {
        n += 1;
        return 7;
      },
      { attempts: 3, baseMs: 1, maxMs: 5 },
    );
    expect(v).toBe(7);
    expect(n).toBe(1);
  });

  it("retries then succeeds", async () => {
    let n = 0;
    const v = await withRetries(
      async () => {
        n += 1;
        if (n < 3) throw new Error("fail");
        return 9;
      },
      { attempts: 5, baseMs: 1, maxMs: 10 },
    );
    expect(v).toBe(9);
    expect(n).toBe(3);
  });
});
