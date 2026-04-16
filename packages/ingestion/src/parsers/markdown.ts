import type { DocumentParser, ParsedDocument } from "../types.js";

export const markdownParser: DocumentParser = {
  id: "markdown",
  extensions: [".md", ".markdown"],
  async parse({ buffer, fileName }) {
    const text = buffer.toString("utf8");
    return {
      text,
      title: fileName,
      mime: "text/markdown",
      metadata: {},
    } satisfies ParsedDocument;
  },
};
