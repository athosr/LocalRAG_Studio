from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class TextChunk:
    index: int
    content: str
    char_start: int
    char_end: int


def chunk_text(text: str, chunk_size: int, chunk_overlap: int) -> list[TextChunk]:
    normalized = text.replace("\r\n", "\n").strip()
    if not normalized:
        return []

    size = max(200, chunk_size)
    overlap = min(max(0, chunk_overlap), size // 2)
    step = max(1, size - overlap)

    chunks: list[TextChunk] = []
    start = 0
    index = 0
    while start < len(normalized):
        end = min(len(normalized), start + size)
        content = normalized[start:end].strip()
        if content:
            chunks.append(
                TextChunk(
                    index=index,
                    content=content,
                    char_start=start,
                    char_end=end,
                )
            )
            index += 1
        if end >= len(normalized):
            break
        start += step
    return chunks
