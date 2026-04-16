-- pgvectorscale: StreamingDiskANN index on pgvector embeddings (requires pgvector types).
CREATE EXTENSION IF NOT EXISTS vectorscale CASCADE;

DROP INDEX IF EXISTS chunks_embedding_hnsw;

CREATE INDEX IF NOT EXISTS chunks_embedding_diskann
  ON chunks
  USING diskann (embedding vector_cosine_ops);
