import type pg from "pg";

export type ChunkInsert = {
  documentId: string;
  chunkIndex: number;
  content: string;
  charStart: number | null;
  charEnd: number | null;
  embedding: number[];
};

export async function insertChunksPool(pool: pg.Pool, rows: ChunkInsert[]) {
  if (rows.length === 0) return;
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const r of rows) {
      const vec = `[${r.embedding.join(",")}]`;
      await client.query(
        `
        INSERT INTO chunks (document_id, chunk_index, content, char_start, char_end, embedding)
        VALUES ($1, $2, $3, $4, $5, $6::vector)
        `,
        [r.documentId, r.chunkIndex, r.content, r.charStart, r.charEnd, vec],
      );
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}

export async function replaceDocumentChunksPool(
  pool: pg.Pool,
  documentId: string,
  rows: ChunkInsert[],
) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`DELETE FROM chunks WHERE document_id = $1`, [
      documentId,
    ]);
    for (const r of rows) {
      const vec = `[${r.embedding.join(",")}]`;
      await client.query(
        `
        INSERT INTO chunks (document_id, chunk_index, content, char_start, char_end, embedding)
        VALUES ($1, $2, $3, $4, $5, $6::vector)
        `,
        [r.documentId, r.chunkIndex, r.content, r.charStart, r.charEnd, vec],
      );
    }
    await client.query("COMMIT");
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
