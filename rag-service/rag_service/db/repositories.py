from __future__ import annotations

import math
from dataclasses import dataclass
from typing import Any

from psycopg.rows import dict_row
from psycopg.types.json import Json
from psycopg_pool import ConnectionPool


@dataclass(frozen=True)
class RetrievedChunk:
    chunk_id: str
    document_id: str
    title: str
    mime: str
    source_path: str | None
    chunk_index: int
    content: str
    distance: float


def find_document_by_hash(pool: ConnectionPool, content_hash: str) -> str | None:
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                "SELECT id::text FROM documents WHERE content_hash = %s LIMIT 1",
                (content_hash,),
            )
            row = cur.fetchone()
            return str(row[0]) if row else None


def insert_document(
    pool: ConnectionPool,
    *,
    source_path: str | None,
    title: str,
    mime: str,
    content_hash: str,
    status: str = "ready",
) -> str:
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO documents (source_path, title, mime, content_hash, status)
                VALUES (%s, %s, %s, %s, %s)
                RETURNING id::text
                """,
                (source_path, title, mime, content_hash, status),
            )
            row = cur.fetchone()
            assert row
            return str(row[0])


def replace_document_chunks(
    pool: ConnectionPool,
    document_id: str,
    rows: list[dict[str, Any]],
) -> None:
    """rows: chunkIndex, content, charStart, charEnd, embedding (list[float])."""
    with pool.connection() as conn:
        with conn.transaction():
            with conn.cursor() as cur:
                cur.execute(
                    "DELETE FROM chunks WHERE document_id = %s::uuid", (document_id,)
                )
                for r in rows:
                    vec = "[" + ",".join(str(x) for x in r["embedding"]) + "]"
                    cur.execute(
                        """
                        INSERT INTO chunks (document_id, chunk_index, content, char_start, char_end, embedding)
                        VALUES (%s::uuid, %s, %s, %s, %s, %s::vector)
                        """,
                        (
                            document_id,
                            r["chunkIndex"],
                            r["content"],
                            r["charStart"],
                            r["charEnd"],
                            vec,
                        ),
                    )


def search_similar_chunks(
    pool: ConnectionPool,
    query_embedding: list[float],
    top_k: int,
) -> list[RetrievedChunk]:
    if not all(math.isfinite(float(v)) for v in query_embedding):
        raise ValueError("Embedding contains non-finite values")
    query_embedding = [float(v) for v in query_embedding]
    k = min(max(int(top_k), 1), 50)
    vec = "[" + ",".join(str(x) for x in query_embedding) + "]"
    with pool.connection() as conn:
        with conn.cursor(row_factory=dict_row) as cur:
            cur.execute(
                """
                SELECT
                  c.id AS "chunkId",
                  c.document_id AS "documentId",
                  d.title,
                  d.mime,
                  d.source_path AS "sourcePath",
                  c.chunk_index AS "chunkIndex",
                  c.content,
                  (c.embedding <=> %s::vector) AS distance
                FROM chunks c
                JOIN documents d ON d.id = c.document_id
                ORDER BY c.embedding <=> %s::vector
                LIMIT %s
                """,
                (vec, vec, k),
            )
            out: list[RetrievedChunk] = []
            for row in cur:
                out.append(
                    RetrievedChunk(
                        chunk_id=str(row["chunkId"]),
                        document_id=str(row["documentId"]),
                        title=str(row["title"]),
                        mime=str(row["mime"]),
                        source_path=row.get("sourcePath"),
                        chunk_index=int(row["chunkIndex"]),
                        content=str(row["content"]),
                        distance=float(row["distance"]),
                    )
                )
            return out


def log_ingestion_event(
    pool: ConnectionPool,
    *,
    document_id: str | None,
    stage: str,
    error: str | None = None,
    bytes_: int | None = None,
    duration_ms: int | None = None,
) -> None:
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO ingestion_events (document_id, stage, error, bytes, duration_ms)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (document_id, stage, error, bytes_, duration_ms),
            )


def log_query_event(
    pool: ConnectionPool,
    *,
    provider: str,
    model: str,
    latency_ms: int | None,
    top_k: int | None,
    retrieved_chunk_ids: list[str] | None,
) -> None:
    with pool.connection() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO query_events (provider, model, latency_ms, top_k, retrieved_chunk_ids)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (
                    provider,
                    model,
                    latency_ms,
                    top_k,
                    Json(retrieved_chunk_ids or []),
                ),
            )
