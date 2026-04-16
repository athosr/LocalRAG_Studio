import { extname } from "node:path";
import { jsonParser } from "./parsers/json.js";
import { markdownParser } from "./parsers/markdown.js";
import { pdfParser } from "./parsers/pdf.js";
import { textParser } from "./parsers/text.js";
import type { DocumentParser } from "./types.js";

const parsers: DocumentParser[] = [
  textParser,
  markdownParser,
  jsonParser,
  pdfParser,
];

const byExt = new Map<string, DocumentParser>();
for (const p of parsers) {
  for (const ext of p.extensions) {
    byExt.set(ext.toLowerCase(), p);
  }
}

export function resolveParser(fileName: string): DocumentParser | null {
  const ext = extname(fileName).toLowerCase();
  return byExt.get(ext) ?? null;
}

export function listSupportedExtensions(): string[] {
  return [...new Set(parsers.flatMap((p) => p.extensions))].sort();
}
