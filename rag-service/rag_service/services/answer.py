from __future__ import annotations

import re
import time
from typing import Any

from rag_service.contracts import AppSettingsPayload, RagCitation
from rag_service.db.pool import get_pool
from rag_service.db import repositories as repo
from rag_service.domain.citations import build_citation_excerpt, parse_cited_ref_indices
from rag_service.llm import embeddings as emb


def _build_context_block(hits: list[repo.RetrievedChunk]) -> str:
    blocks: list[str] = []
    for i, h in enumerate(hits):
        excerpt = re.sub(r"\s+", " ", h.content)[:1200]
        blocks.append(
            f'[#{i + 1}] title="{h.title}" chunk={h.chunk_index} id={h.chunk_id}\n{excerpt}'
        )
    return "\n\n".join(blocks)


def answer_question(
    *,
    question: str,
    settings: AppSettingsPayload,
    api_key: str | None,
) -> dict[str, Any]:
    pool = get_pool()
    started_ms = int(time.time() * 1000)

    q_emb = emb.embed_text(settings, api_key, question)
    if len(q_emb) != settings.rag.embedding_dimensions:
        raise ValueError(
            f"Query embedding dimension mismatch: got {len(q_emb)}, expected {settings.rag.embedding_dimensions}"
        )

    hits = repo.search_similar_chunks(pool, q_emb, settings.rag.top_k)
    context = _build_context_block(hits)

    messages = [
        {
            "role": "system",
            "content": (
                "You are a careful assistant. Answer using ONLY the provided context. "
                "If the context is insufficient, say you do not know. When you use a fact, "
                "cite the bracket reference like [#1] or [#2]. Cite only passages that directly "
                "support that claim (do not add extra [#n] tags just because a keyword appears elsewhere). "
                "You may group refs as [#2, #5] when one sentence is supported by multiple passages."
            ),
        },
        {
            "role": "user",
            "content": f"Context:\n{context}\n\nQuestion: {question}",
        },
    ]

    text = emb.complete_chat(settings, api_key, messages)

    all_citations: list[RagCitation] = []
    for i, h in enumerate(hits):
        all_citations.append(
            RagCitation(
                ref_index=i + 1,
                chunk_id=h.chunk_id,
                document_id=h.document_id,
                title=h.title,
                chunk_index=h.chunk_index,
                excerpt=build_citation_excerpt(h.content),
            )
        )

    by_ref = {c.ref_index: c for c in all_citations}
    cited_order = parse_cited_ref_indices(text)
    citations: list[RagCitation] = []
    if cited_order:
        citations = [by_ref[r] for r in cited_order if r in by_ref]
    if not citations and all_citations:
        citations = [all_citations[0]]

    primary_refs = {c.ref_index for c in citations}
    other_retrieved = [c for c in all_citations if c.ref_index not in primary_refs]

    model_name = (
        settings.ollama.chat_model
        if settings.active_provider == "ollama"
        else settings.custom_http.model
    )
    repo.log_query_event(
        pool,
        provider=settings.active_provider,
        model=model_name,
        latency_ms=int(time.time() * 1000) - started_ms,
        top_k=settings.rag.top_k,
        retrieved_chunk_ids=[h.chunk_id for h in hits],
    )

    return {
        "text": text,
        "citations": [c.model_dump(mode="json", by_alias=True) for c in citations],
        "otherRetrieved": [
            c.model_dump(mode="json", by_alias=True) for c in other_retrieved
        ],
    }
