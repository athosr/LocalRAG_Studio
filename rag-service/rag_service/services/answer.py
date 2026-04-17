from __future__ import annotations

import re
import time
from typing import Any

from rag_service.contracts import AppSettingsPayload, RagCitation
from rag_service.db.pool import get_pool
from rag_service.db import repositories as repo
from rag_service.domain.citations import (
    build_citation_excerpt,
    filter_valid_ref_indices,
    parse_cited_ref_indices,
)
from rag_service.llm import embeddings as emb


_IDENTIFIER_RE = re.compile(r"\b[A-Za-z]{1,12}-\d{1,12}[A-Za-z]?\b")


def _extract_query_identifiers(question: str) -> list[str]:
    identifiers: list[str] = []
    seen: set[str] = set()
    for match in _IDENTIFIER_RE.finditer(question):
        token = match.group(0).upper()
        if token in seen:
            continue
        seen.add(token)
        identifiers.append(token)
    return identifiers


def _rerank_hits_by_identifier_overlap(
    *,
    question: str,
    hits: list[repo.RetrievedChunk],
    top_k: int,
) -> list[repo.RetrievedChunk]:
    if top_k <= 0 or not hits:
        return []

    identifiers = _extract_query_identifiers(question)
    if not identifiers:
        return hits[:top_k]

    scored: list[tuple[int, float, int, repo.RetrievedChunk]] = []
    for i, hit in enumerate(hits):
        haystack = f"{hit.title}\n{hit.content}".upper()
        matched = 0
        for ident in identifiers:
            if ident in haystack:
                matched += 1
        # Prefer hits that cover more exact question identifiers;
        # tie-break by vector distance then original order.
        scored.append((matched, -hit.distance, -i, hit))

    scored.sort(reverse=True)
    return [row[3] for row in scored[:top_k]]


def _build_context_block(hits: list[repo.RetrievedChunk]) -> str:
    blocks: list[str] = []
    for i, h in enumerate(hits):
        excerpt = re.sub(r"\s+", " ", h.content)[:1200]
        blocks.append(
            f'[#{i + 1}] title="{h.title}" chunk={h.chunk_index} id={h.chunk_id}\n{excerpt}'
        )
    return "\n\n".join(blocks)


def _build_answer_messages(*, context: str, question: str) -> list[dict[str, str]]:
    return [
        {
            "role": "system",
            "content": (
                "You are a careful assistant. Answer using ONLY the provided context. "
                "If the context is insufficient, say you do not know. "
                "Every factual sentence MUST include at least one citation tag [#n] that directly supports it. "
                "Use only citation numbers that exist in the provided context block. "
                "You may group refs as [#2, #5] when one sentence is supported by multiple passages."
            ),
        },
        {
            "role": "user",
            "content": f"Context:\n{context}\n\nQuestion: {question}",
        },
    ]


def _build_citation_repair_messages(
    *,
    context: str,
    question: str,
    draft_answer: str,
) -> list[dict[str, str]]:
    return [
        {
            "role": "system",
            "content": (
                "You are a citation formatter. Keep the same meaning as the draft answer, "
                "but ensure every factual sentence has [#n] citations from the provided context. "
                "Do NOT introduce new facts. Use only citation numbers present in context."
            ),
        },
        {
            "role": "user",
            "content": (
                f"Context:\n{context}\n\n"
                f"Question: {question}\n\n"
                f"Draft answer:\n{draft_answer}\n\n"
                "Return only the corrected answer text with [#n] citations."
            ),
        },
    ]


def _extract_valid_cited_refs(answer_text: str, *, max_ref: int) -> list[int]:
    raw = parse_cited_ref_indices(answer_text)
    return filter_valid_ref_indices(raw, max_ref=max_ref)


def _complete_with_citation_repair(
    *,
    settings: AppSettingsPayload,
    api_key: str | None,
    context: str,
    question: str,
    max_ref: int,
) -> tuple[str, list[int]]:
    text = emb.complete_chat(
        settings,
        api_key,
        _build_answer_messages(context=context, question=question),
    )
    cited_refs = _extract_valid_cited_refs(text, max_ref=max_ref)
    if cited_refs or max_ref <= 0:
        return text, cited_refs

    repaired = emb.complete_chat(
        settings,
        api_key,
        _build_citation_repair_messages(
            context=context,
            question=question,
            draft_answer=text,
        ),
    )
    repaired_refs = _extract_valid_cited_refs(repaired, max_ref=max_ref)
    if repaired_refs:
        return repaired, repaired_refs
    return text, []


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

    expanded_k = min(max(settings.rag.top_k * 5, settings.rag.top_k), 50)
    retrieved = repo.search_similar_chunks(pool, q_emb, expanded_k)
    hits = _rerank_hits_by_identifier_overlap(
        question=question,
        hits=retrieved,
        top_k=settings.rag.top_k,
    )
    context = _build_context_block(hits)

    text, cited_order = _complete_with_citation_repair(
        settings=settings,
        api_key=api_key,
        context=context,
        question=question,
        max_ref=len(hits),
    )

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
    citations: list[RagCitation] = []
    if cited_order:
        citations = [by_ref[r] for r in cited_order if r in by_ref]

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
