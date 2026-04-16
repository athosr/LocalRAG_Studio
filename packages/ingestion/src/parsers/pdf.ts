import pdfParse from "pdf-parse";
import type { DocumentParser, ParsedDocument } from "../types.js";

export const pdfParser: DocumentParser = {
  id: "pdf",
  extensions: [".pdf"],
  async parse({ buffer, fileName }) {
    const data = await pdfParse(buffer);
    return {
      text: data.text ?? "",
      title: fileName,
      mime: "application/pdf",
      metadata: { pages: data.numpages },
    } satisfies ParsedDocument;
  },
};
