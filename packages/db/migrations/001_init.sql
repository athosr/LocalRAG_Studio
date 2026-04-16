-- Extensions (pgvector; pgvectorscale applied in a later migration)
CREATE EXTENSION IF NOT EXISTS vector;

-- Core tables
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_path text,
  title text NOT NULL,
  mime text NOT NULL,
  content_hash text NOT NULL,
  status text NOT NULL DEFAULT 'ready',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id uuid NOT NULL REFERENCES documents (id) ON DELETE CASCADE,
  chunk_index int NOT NULL,
  content text NOT NULL,
  char_start int,
  char_end int,
  embedding vector(768) NOT NULL
);

CREATE INDEX IF NOT EXISTS chunks_document_id_idx ON chunks (document_id);

CREATE INDEX IF NOT EXISTS chunks_embedding_hnsw ON chunks USING hnsw (embedding vector_cosine_ops);

CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations (id) ON DELETE CASCADE,
  role text NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS messages_conversation_id_idx ON messages (conversation_id);

-- Telemetry (plain tables)
CREATE TABLE IF NOT EXISTS ingestion_events (
  time timestamptz NOT NULL DEFAULT now(),
  document_id uuid REFERENCES documents (id) ON DELETE SET NULL,
  stage text NOT NULL,
  error text,
  bytes int,
  duration_ms int
);

CREATE TABLE IF NOT EXISTS query_events (
  time timestamptz NOT NULL DEFAULT now(),
  provider text NOT NULL,
  model text NOT NULL,
  latency_ms int,
  top_k int,
  retrieved_chunk_ids jsonb
);
