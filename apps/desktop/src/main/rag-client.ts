import type { AppSettings } from "@localrag/config";

export type IngestFileResult =
  | { ok: true; documentId: string; deduped: boolean }
  | { ok: false; error: string };

export type RagCitation = {
  refIndex: number;
  chunkId: string;
  documentId: string;
  title: string;
  chunkIndex: number;
  excerpt: string;
};

export type RagAnswer = {
  text: string;
  citations: RagCitation[];
  otherRetrieved: RagCitation[];
};

export async function ragIngest(params: {
  baseUrl: string;
  buffer: Buffer;
  fileName: string;
  sourcePath: string | null | undefined;
  settings: AppSettings;
  apiKey: string | null;
}): Promise<IngestFileResult> {
  const fd = new FormData();
  fd.append("file", new Blob([params.buffer]), params.fileName);
  fd.append("settings", JSON.stringify(params.settings));
  if (params.apiKey) fd.append("api_key", params.apiKey);
  if (params.sourcePath) fd.append("source_path", params.sourcePath);
  const res = await fetch(`${params.baseUrl}/v1/ingest`, {
    method: "POST",
    body: fd,
  });
  if (!res.ok) {
    return { ok: false, error: (await res.text()) || `HTTP ${res.status}` };
  }
  return (await res.json()) as IngestFileResult;
}

export async function ragAsk(params: {
  baseUrl: string;
  question: string;
  settings: AppSettings;
  apiKey: string | null;
}): Promise<RagAnswer> {
  const res = await fetch(`${params.baseUrl}/v1/ask`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      question: params.question,
      settings: params.settings,
      apiKey: params.apiKey ?? undefined,
    }),
  });
  if (!res.ok) {
    throw new Error((await res.text()) || `RAG ask failed: ${res.status}`);
  }
  return (await res.json()) as RagAnswer;
}

export async function ragListOllamaModels(
  baseUrl: string,
  host: string,
): Promise<string[]> {
  const u = new URL(`${baseUrl}/v1/ollama/models`);
  u.searchParams.set("host", host);
  const res = await fetch(u);
  if (!res.ok) {
    throw new Error((await res.text()) || `Ollama models failed: ${res.status}`);
  }
  const data = (await res.json()) as { models?: string[] };
  return data.models ?? [];
}
