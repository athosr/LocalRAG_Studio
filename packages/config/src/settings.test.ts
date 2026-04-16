import { describe, expect, it } from "vitest";
import { appSettingsSchema, defaultSettings } from "./index.js";

describe("appSettingsSchema", () => {
  it("parses defaults", () => {
    const d = defaultSettings();
    expect(appSettingsSchema.parse(d).rag.topK).toBe(5);
  });

  it("allows overriding rag settings", () => {
    const d = defaultSettings();
    const merged = appSettingsSchema.parse({
      ...d,
      rag: { ...d.rag, topK: 8 },
    });
    expect(merged.rag.topK).toBe(8);
    expect(merged.rag.chunkSize).toBe(d.rag.chunkSize);
  });
});
