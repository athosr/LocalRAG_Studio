from __future__ import annotations

import json
import os
from collections.abc import Callable
from dataclasses import dataclass
from io import BytesIO

from pypdf import PdfReader


@dataclass(frozen=True)
class ParsedDocument:
    text: str
    title: str
    mime: str


def _parse_txt(buffer: bytes, file_name: str) -> ParsedDocument:
    text = buffer.decode("utf-8", errors="replace")
    return ParsedDocument(text=text, title=file_name, mime="text/plain")


def _parse_md(buffer: bytes, file_name: str) -> ParsedDocument:
    text = buffer.decode("utf-8", errors="replace")
    return ParsedDocument(text=text, title=file_name, mime="text/markdown")


def _parse_json(buffer: bytes, file_name: str) -> ParsedDocument:
    raw = buffer.decode("utf-8", errors="replace")
    try:
        parsed = json.loads(raw)
        text = parsed if isinstance(parsed, str) else json.dumps(parsed, indent=2)
    except json.JSONDecodeError:
        text = raw
    return ParsedDocument(text=text, title=file_name, mime="application/json")


def _parse_pdf(buffer: bytes, file_name: str) -> ParsedDocument:
    reader = PdfReader(BytesIO(buffer))
    parts: list[str] = []
    for page in reader.pages:
        t = page.extract_text()
        if t:
            parts.append(t)
    text = "\n".join(parts)
    return ParsedDocument(text=text, title=file_name, mime="application/pdf")


_PARSERS: dict[str, Callable[[bytes, str], ParsedDocument]] = {
    ".txt": _parse_txt,
    ".md": _parse_md,
    ".markdown": _parse_md,
    ".json": _parse_json,
    ".pdf": _parse_pdf,
}


def parse_file(file_name: str, buffer: bytes) -> ParsedDocument | None:
    ext = os.path.splitext(file_name)[1].lower()
    fn = _PARSERS.get(ext)
    if fn is None:
        return None
    return fn(buffer, file_name)
