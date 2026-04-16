import type { AppSettings } from "@localrag/config";
import type { Db } from "@localrag/db";
import { logQueryEvent, searchSimilarChunks } from "@localrag/db";
import { createLlmProviderFromSettings, embedText } from "@localrag/llm";
import type { ChatMessage } from "@localrag/llm";
import type pg from "pg";

export type RagCitation = {
  /** Matches `[#n]` in the LLM context and answer text (1-based). */
  refIndex: number;
  chunkId: string;
  documentId: string;
  title: string;
  /** 0-based chunk index within its source document (first chunk is 0). */
  chunkIndex: number;
  excerpt: string;
};

export type RagAnswer = {
  text: string;
  /** Passages cited in the answer via `[#n]` (or top match if none cited). */
  citations: RagCitation[];
  /** Other retrieved passages sent to the model but not cited in the answer. */
  otherRetrieved: RagCitation[];
};

/** Preview text for UI: long chunks use head + tail so facts at the end stay visible. */
function buildCitationExcerpt(content: string, maxTotal = 720): string {
  const t = content.trim();
  if (t.length <= maxTotal) return t;
  const sep = "\n…\n";
  const budget = maxTotal - sep.length;
  const headLen = Math.ceil(budget * 0.6);
  const tailLen = Math.max(1, budget - headLen);
  return `${t.slice(0, headLen)}${sep}${t.slice(-tailLen)}`;
}

/**
 * Extract `[#n]` references from model output in left-to-right order, deduped.
 * Supports comma lists in one bracket, e.g. `[#2, #5]` or `[#2,#5]`, as well
 * as repeated singles like `[#2][#5]`.
 */
export function parseCitedRefIndices(answerText: string): number[] {
  type Span = { index: number; refs: number[] };
  const spans: Span[] = [];

  // Multi-ref in one bracket: [#2, #5] (not [#1] alone — needs a comma group)
  const multi = /\[(?:\s*#\d+\s*,\s*)+#\d+\s*\]/g;
  let m: RegExpExecArray | null;
  while ((m = multi.exec(answerText)) !== null) {
    const refs = [...m[0].matchAll(/#(\d+)/g)]
      .map((g) => Number.parseInt(g[1]!, 10))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (refs.length >= 2) spans.push({ index: m.index, refs });
  }

  const single = /\[#(\d+)\]/g;
  while ((m = single.exec(answerText)) !== null) {
    const n = Number.parseInt(m[1]!, 10);
    if (Number.isFinite(n) && n > 0) spans.push({ index: m.index, refs: [n] });
  }

  spans.sort((a, b) => a.index - b.index);
  const out: number[] = [];
  const seen = new Set<number>();
  for (const s of spans) {
    for (const r of s.refs) {
      if (seen.has(r)) continue;
      seen.add(r);
      out.push(r);
    }
  }
  return out;
}

function buildContextBlock(
  hits: Awaited<ReturnType<typeof searchSimilarChunks>>,
) {
  return hits
    .map((h, i) => {
      const excerpt = h.content.replace(/\s+/g, " ").slice(0, 1200);
      return `[#${i + 1}] title="${h.title}" chunk=${h.chunkIndex} id=${h.chunkId}\n${excerpt}`;
    })
    .join("\n\n");
}

export async function answerQuestion(params: {
  db: Db;
  pool: pg.Pool;
  settings: AppSettings;
  apiKey: string | null;
  question: string;
}): Promise<RagAnswer> {
  const { db, pool, settings, apiKey, question } = params;
  const started = Date.now();
  const qEmb = await embedText(settings, apiKey, question);
  if (qEmb.length !== settings.rag.embeddingDimensions) {
    throw new Error(
      `Query embedding dimension mismatch: got ${qEmb.length}, expected ${settings.rag.embeddingDimensions}`,
    );
  }

  const hits = await searchSimilarChunks(
    pool,
    qEmb,
    settings.rag.topK,
  );

  const provider = createLlmProviderFromSettings(settings, apiKey);
  const context = buildContextBlock(hits);

  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        "You are a careful assistant. Answer using ONLY the provided context. If the context is insufficient, say you do not know. When you use a fact, cite the bracket reference like [#1] or [#2]. Cite only passages that directly support that claim (do not add extra [#n] tags just because a keyword appears elsewhere). You may group refs as [#2, #5] when one sentence is supported by multiple passages.",
    },
    {
      role: "user",
      content: `Context:\n${context}\n\nQuestion: ${question}`,
    },
  ];

  const { text } = await provider.complete(messages);

  const all: RagCitation[] = hits.map((h, i) => ({
    refIndex: i + 1,
    chunkId: h.chunkId,
    documentId: h.documentId,
    title: h.title,
    chunkIndex: h.chunkIndex,
    excerpt: buildCitationExcerpt(h.content),
  }));

  const byRef = new Map(all.map((c) => [c.refIndex, c]));
  const citedOrder = parseCitedRefIndices(text);
  let citations: RagCitation[] = [];

  if (citedOrder.length > 0) {
    citations = citedOrder
      .map((ref) => byRef.get(ref))
      .filter((c): c is RagCitation => c !== undefined);
  }
  if (citations.length === 0 && all.length > 0) {
    citations = [all[0]];
  }

  const primaryRefs = new Set(citations.map((c) => c.refIndex));
  const otherRetrieved = all.filter((c) => !primaryRefs.has(c.refIndex));

  await logQueryEvent(db, {
    provider: settings.activeProvider,
    model:
      settings.activeProvider === "ollama"
        ? settings.ollama.chatModel
        : settings.customHttp.model,
    latencyMs: Date.now() - started,
    topK: settings.rag.topK,
    retrievedChunkIds: hits.map((h) => h.chunkId),
  });

  return { text, citations, otherRetrieved };
}
