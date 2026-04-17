import type { AppSettings } from "@localrag/config";

export type CitationRow = {
  refIndex: number;
  chunkId: string;
  documentId: string;
  title: string;
  chunkIndex: number;
  excerpt: string;
};

/** One row in the chat thread (UI + persisted shape). */
export type ChatMessageViewModel = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string | null;
  metadata?: {
    citations: CitationRow[];
    otherRetrieved: CitationRow[];
  };
};

/** One file after POST /v1/ingest (or read/network failure before a successful response). */
export type IngestPathResult = {
  path: string;
  ok: boolean;
  documentId?: string;
  deduped?: boolean;
  error?: string;
};

export type LocalragApi = {
  listDocuments: () => Promise<
    {
      id: string;
      title: string;
      mime: string;
      contentHash: string;
      status: string;
      createdAt: Date | null;
      sourcePath: string | null;
    }[]
  >;
  deleteDocument: (id: string) => Promise<{ ok: boolean }>;
  clearAllDocuments: () => Promise<
    { ok: true; removed: number } | { ok: false; cancelled: true }
  >;
  pickIngestPaths: () => Promise<{ ok: true; paths: string[] }>;
  ingestPath: (path: string) => Promise<IngestPathResult>;
  ask: (question: string) => Promise<{
    text: string;
    citations: CitationRow[];
    otherRetrieved: CitationRow[];
  }>;
  getSettings: () => Promise<{ settings: AppSettings; hasApiKey: boolean }>;
  setSettings: (payload: {
    settings: AppSettings;
    apiKey?: string | null;
  }) => Promise<{ ok: boolean }>;
  resetSettings: () => Promise<{ ok: boolean }>;
  listOllamaModels: () => Promise<string[]>;
  listChatMessages: () => Promise<
    {
      id: string;
      role: "user" | "assistant";
      content: string;
      createdAt: string;
      metadata: {
        citations?: unknown[];
        otherRetrieved?: unknown[];
      } | null;
    }[]
  >;
  appendChatExchange: (payload: {
    userContent: string;
    assistantContent: string;
    metadata: { citations: CitationRow[]; otherRetrieved: CitationRow[] } | null;
  }) => Promise<{ ok: true; userId: string; assistantId: string }>;
  clearChatMessages: () => Promise<
    { ok: true; removed: number } | { ok: false; cancelled: true }
  >;
};

export type DocumentRow = Awaited<ReturnType<LocalragApi["listDocuments"]>>[number];
