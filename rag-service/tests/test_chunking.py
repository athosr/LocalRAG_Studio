from rag_service.domain.chunking import chunk_text


def test_blank_returns_empty():
    assert chunk_text("   ", 500, 50) == []


def test_splits_with_overlap():
    body = "a" * 500
    chunks = chunk_text(body, 200, 40)
    assert len(chunks) > 1
    assert len(chunks[0].content) > 0
