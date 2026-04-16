import { chunkText } from "@localrag/ingestion";
import { describe, expect, it } from "vitest";

describe("@localrag/core workspace", () => {
  it("can import ingestion utilities", () => {
    expect(chunkText("hello world", 5, 0).length).toBeGreaterThan(0);
  });
});
