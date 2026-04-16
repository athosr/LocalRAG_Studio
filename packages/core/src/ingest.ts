import type { AppSettings } from "@localrag/config";
import type { Db } from "@localrag/db";
import {
  findDocumentByHash,
  insertDocument,
  logIngestionEvent,
  replaceDocumentChunksPool,
} from "@localrag/db";
import { chunkText, resolveParser, sha256Hex } from "@localrag/ingestion";
import { embedText } from "@localrag/llm";
import type pg from "pg";

export type IngestFileInput = {
  buffer: Buffer;
  fileName: string;
  sourcePath?: string | null;
};

export type IngestFileResult =
  | { ok: true; documentId: string; deduped: boolean }
  | { ok: false; error: string };

function assertEmbeddingDim(vec: number[], expected: number) {
  if (vec.length !== expected) {
    throw new Error(
      `Embedding dimension mismatch: got ${vec.length}, expected ${expected}`,
    );
  }
}

export async function ingestFile(params: {
  db: Db;
  pool: pg.Pool;
  settings: AppSettings;
  apiKey: string | null;
  input: IngestFileInput;
}): Promise<IngestFileResult> {
  const { db, pool, settings, apiKey, input } = params;
  const started = Date.now();
  let documentId: string | null = null;
  try {
    const parser = resolveParser(input.fileName);
    if (!parser) {
      return { ok: false, error: "Unsupported file type" };
    }

    const parsed = await parser.parse({
      buffer: input.buffer,
      fileName: input.fileName,
    });
    const hash = sha256Hex(parsed.text);
    const existing = await findDocumentByHash(db, hash);
    if (existing) {
      return { ok: true, documentId: existing.id, deduped: true };
    }

    const doc = await insertDocument(db, {
      sourcePath: input.sourcePath ?? null,
      title: parsed.title,
      mime: parsed.mime,
      contentHash: hash,
      status: "ready",
    });
    documentId = doc.id;

    const parts = chunkText(
      parsed.text,
      settings.rag.chunkSize,
      settings.rag.chunkOverlap,
    );

    const rows = [];
    for (const p of parts) {
      const emb = await embedText(settings, apiKey, p.content);
      assertEmbeddingDim(emb, settings.rag.embeddingDimensions);
      rows.push({
        documentId: doc.id,
        chunkIndex: p.index,
        content: p.content,
        charStart: p.charStart,
        charEnd: p.charEnd,
        embedding: emb,
      });
    }

    await replaceDocumentChunksPool(pool, doc.id, rows);

    await logIngestionEvent(db, {
      documentId: doc.id,
      stage: "complete",
      bytes: input.buffer.byteLength,
      durationMs: Date.now() - started,
    });

    return { ok: true, documentId: doc.id, deduped: false };
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await logIngestionEvent(db, {
      documentId,
      stage: "error",
      error: message,
      bytes: input.buffer.byteLength,
      durationMs: Date.now() - started,
    });
    return { ok: false, error: message };
  }
}
