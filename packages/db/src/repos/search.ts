import type pg from "pg";

export type RetrievedChunk = {
  chunkId: string;
  documentId: string;
  title: string;
  mime: string;
  sourcePath: string | null;
  chunkIndex: number;
  content: string;
  distance: number;
};

function assertFiniteEmbedding(values: number[]) {
  for (const v of values) {
    if (!Number.isFinite(v)) throw new Error("Embedding contains non-finite values");
  }
}

export async function searchSimilarChunks(
  pool: pg.Pool,
  queryEmbedding: number[],
  topK: number,
): Promise<RetrievedChunk[]> {
  assertFiniteEmbedding(queryEmbedding);
  const k = Math.min(Math.max(Math.floor(topK), 1), 50);
  const vec = `[${queryEmbedding.join(",")}]`;
  const { rows } = await pool.query<RetrievedChunk>(
    `
    SELECT
      c.id AS "chunkId",
      c.document_id AS "documentId",
      d.title,
      d.mime,
      d.source_path AS "sourcePath",
      c.chunk_index AS "chunkIndex",
      c.content,
      (c.embedding <=> $1::vector) AS distance
    FROM chunks c
    JOIN documents d ON d.id = c.document_id
    ORDER BY c.embedding <=> $1::vector
    LIMIT $2
    `,
    [vec, k],
  );
  return rows;
}
