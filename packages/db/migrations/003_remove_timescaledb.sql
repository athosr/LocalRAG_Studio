-- Upgrade path: drop Timescale hypertables for telemetry and remove the extension.
-- Safe on fresh installs (empty copy; DROP EXTENSION IF EXISTS is a no-op).

DROP TABLE IF EXISTS public._lr_mig_ingestion_events CASCADE;
DROP TABLE IF EXISTS public._lr_mig_query_events CASCADE;

CREATE TABLE public._lr_mig_ingestion_events (
  "time" timestamptz NOT NULL DEFAULT now(),
  document_id uuid REFERENCES public.documents (id) ON DELETE SET NULL,
  stage text NOT NULL,
  error text,
  bytes int,
  duration_ms int
);

INSERT INTO public._lr_mig_ingestion_events SELECT * FROM public.ingestion_events;
DROP TABLE public.ingestion_events CASCADE;
ALTER TABLE public._lr_mig_ingestion_events RENAME TO ingestion_events;

CREATE TABLE public._lr_mig_query_events (
  "time" timestamptz NOT NULL DEFAULT now(),
  provider text NOT NULL,
  model text NOT NULL,
  latency_ms int,
  top_k int,
  retrieved_chunk_ids jsonb
);

INSERT INTO public._lr_mig_query_events SELECT * FROM public.query_events;
DROP TABLE public.query_events CASCADE;
ALTER TABLE public._lr_mig_query_events RENAME TO query_events;

DROP EXTENSION IF EXISTS timescaledb CASCADE;
