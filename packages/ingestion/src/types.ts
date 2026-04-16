export type ParsedDocument = {
  text: string;
  title: string;
  mime: string;
  metadata: Record<string, unknown>;
};

export type DocumentParser = {
  id: string;
  extensions: string[];
  parse: (input: { buffer: Buffer; fileName: string }) => Promise<ParsedDocument>;
};
