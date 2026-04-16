import { describe, expect, it } from "vitest";
import { chunkText } from "./chunking.js";

describe("chunkText", () => {
  it("returns empty for blank input", () => {
    expect(chunkText("   ", 500, 50)).toEqual([]);
  });

  it("splits long text with overlap", () => {
    const body = "a".repeat(500);
    const chunks = chunkText(body, 200, 40);
    expect(chunks.length).toBeGreaterThan(1);
    expect(chunks[0]!.content.length).toBeGreaterThan(0);
  });
});
