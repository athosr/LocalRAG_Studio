from rag_service.db import repositories as repo
from rag_service.services import answer


def _hit(*, title: str, content: str, distance: float, suffix: str) -> repo.RetrievedChunk:
    return repo.RetrievedChunk(
        chunk_id=f"chunk-{suffix}",
        document_id=f"doc-{suffix}",
        title=title,
        mime="text/markdown",
        source_path=None,
        chunk_index=0,
        content=content,
        distance=distance,
    )


def test_extract_query_identifiers_dedupes_preserves_order():
    ids = answer._extract_query_identifiers(
        "For OL-77 where is FG-9 stored and which key K-19 applies for OL-77?"
    )
    assert ids == ["OL-77", "FG-9", "K-19"]


def test_rerank_hits_by_identifier_overlap_prioritizes_exact_token_matches():
    question = (
        "For manifest line OL-77, where is FG-9 stored, "
        "which access key applies, and local sign-out cutoff time?"
    )
    hits = [
        _hit(
            title="afl_corpus_011.md",
            content="Storm Dial Orange visitor mustering memo.",
            distance=0.12,
            suffix="a",
        ),
        _hit(
            title="afl_corpus_043.md",
            content="K-19 custody and Orion traverse OL-77 sign-out cutoff is 06:00 local.",
            distance=0.20,
            suffix="b",
        ),
        _hit(
            title="afl_corpus_042.md",
            content="FG-9 is stored in Cold Vault CV-4 Bay 2 middle shelf. Access key K-19.",
            distance=0.31,
            suffix="c",
        ),
    ]

    ranked = answer._rerank_hits_by_identifier_overlap(
        question=question,
        hits=hits,
        top_k=2,
    )

    assert [h.title for h in ranked] == ["afl_corpus_043.md", "afl_corpus_042.md"]


def test_rerank_falls_back_to_distance_when_question_has_no_identifiers():
    hits = [
        _hit(title="doc-a", content="A", distance=0.11, suffix="a"),
        _hit(title="doc-b", content="B", distance=0.14, suffix="b"),
    ]
    ranked = answer._rerank_hits_by_identifier_overlap(
        question="What is the emergency radio channel?",
        hits=hits,
        top_k=2,
    )
    assert [h.title for h in ranked] == ["doc-a", "doc-b"]
