from __future__ import annotations

import time
from typing import Any

from rag_service.contracts import AppSettingsPayload
from rag_service.db.pool import get_pool
from rag_service.db import repositories as repo
from rag_service.domain.chunking import chunk_text
from rag_service.domain.hash import sha256_hex
from rag_service.llm import embeddings as emb
from rag_service.parsers import parse_file


def ingest_file(
    *,
    buffer: bytes,
    file_name: str,
    source_path: str | None,
    settings: AppSettingsPayload,
    api_key: str | None,
) -> dict[str, Any]:
    pool = get_pool()
    started = time.time() * 1000
    started_ms = int(started)
    document_id: str | None = None
    try:
        parsed = parse_file(file_name, buffer)
        if parsed is None:
            return {"ok": False, "error": "Unsupported file type"}

        h = sha256_hex(parsed.text)
        existing = repo.find_document_by_hash(pool, h)
        if existing:
            return {"ok": True, "documentId": existing, "deduped": True}

        doc_id = repo.insert_document(
            pool,
            source_path=source_path,
            title=parsed.title,
            mime=parsed.mime,
            content_hash=h,
            status="ready",
        )
        document_id = doc_id

        parts = chunk_text(
            parsed.text,
            settings.rag.chunk_size,
            settings.rag.chunk_overlap,
        )
        rows: list[dict[str, Any]] = []
        for p in parts:
            vec = emb.embed_text(settings, api_key, p.content)
            if len(vec) != settings.rag.embedding_dimensions:
                raise ValueError(
                    f"Embedding dimension mismatch: got {len(vec)}, expected {settings.rag.embedding_dimensions}"
                )
            rows.append(
                {
                    "chunkIndex": p.index,
                    "content": p.content,
                    "charStart": p.char_start,
                    "charEnd": p.char_end,
                    "embedding": vec,
                }
            )

        repo.replace_document_chunks(pool, doc_id, rows)

        repo.log_ingestion_event(
            pool,
            document_id=doc_id,
            stage="complete",
            error=None,
            bytes_=len(buffer),
            duration_ms=int(time.time() * 1000) - started_ms,
        )
        return {"ok": True, "documentId": doc_id, "deduped": False}
    except Exception as e:
        msg = str(e)
        repo.log_ingestion_event(
            pool,
            document_id=document_id,
            stage="error",
            error=msg,
            bytes_=len(buffer),
            duration_ms=int(time.time() * 1000) - started_ms,
        )
        return {"ok": False, "error": msg}
