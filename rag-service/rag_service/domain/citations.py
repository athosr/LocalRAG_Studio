from __future__ import annotations

import re


def build_citation_excerpt(content: str, max_total: int = 720) -> str:
    t = content.strip()
    if len(t) <= max_total:
        return t
    sep = "\n…\n"
    budget = max_total - len(sep)
    head_len = (budget + 1) // 2
    tail_len = max(1, budget - head_len)
    return f"{t[:head_len]}{sep}{t[-tail_len:]}"


def parse_cited_ref_indices(answer_text: str) -> list[int]:
    """Match TS parseCitedRefIndices: multi-ref in one bracket, then singles; left-to-right, deduped."""
    spans: list[tuple[int, list[int]]] = []

    multi = re.compile(r"\[(?:\s*#\d+\s*,\s*)+#\d+\s*\]")
    for m in multi.finditer(answer_text):
        refs = [int(x) for x in re.findall(r"#(\d+)", m.group())]
        refs = [n for n in refs if n > 0]
        if len(refs) >= 2:
            spans.append((m.start(), refs))

    for m in re.finditer(r"\[#(\d+)\]", answer_text):
        n = int(m.group(1))
        if n > 0:
            spans.append((m.start(), [n]))

    spans.sort(key=lambda s: s[0])
    out: list[int] = []
    seen: set[int] = set()
    for _, refs in spans:
        for r in refs:
            if r in seen:
                continue
            seen.add(r)
            out.append(r)
    return out
