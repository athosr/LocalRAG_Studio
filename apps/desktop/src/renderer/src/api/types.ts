import type { AppSettings } from "@localrag/config";

export type CitationRow = {
  refIndex: number;
  chunkId: string;
  documentId: string;
  title: string;
  chunkIndex: number;
  excerpt: string;
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
  ingestPick: () => Promise<{
    ok: boolean;
    results?: {
      path: string;
      ok: boolean;
      documentId?: string;
      deduped?: boolean;
      error?: string;
    }[];
  }>;
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
};

export type DocumentRow = Awaited<ReturnType<LocalragApi["listDocuments"]>>[number];
