import type { DocumentParser, ParsedDocument } from "../types.js";

export const textParser: DocumentParser = {
  id: "text",
  extensions: [".txt"],
  async parse({ buffer, fileName }) {
    const text = buffer.toString("utf8");
    return {
      text,
      title: fileName,
      mime: "text/plain",
      metadata: {},
    } satisfies ParsedDocument;
  },
};
