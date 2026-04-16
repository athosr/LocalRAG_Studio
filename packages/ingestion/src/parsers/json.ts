import type { DocumentParser, ParsedDocument } from "../types.js";

export const jsonParser: DocumentParser = {
  id: "json",
  extensions: [".json"],
  async parse({ buffer, fileName }) {
    const raw = buffer.toString("utf8");
    let text = raw;
    try {
      const parsed = JSON.parse(raw) as unknown;
      text =
        typeof parsed === "string"
          ? parsed
          : JSON.stringify(parsed, null, 2);
    } catch {
      text = raw;
    }
    return {
      text,
      title: fileName,
      mime: "application/json",
      metadata: {},
    } satisfies ParsedDocument;
  },
};
