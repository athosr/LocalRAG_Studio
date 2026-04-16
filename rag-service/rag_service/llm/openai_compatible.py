from __future__ import annotations

from typing import Any

import httpx

from rag_service.llm.retry import with_retries


def join_url(base: str, path: str) -> str:
    return base.rstrip("/") + path


def openai_compatible_embed(
    base_url: str,
    api_key: str | None,
    model: str,
    text: str,
    dimensions: int,
) -> list[float]:
    def call() -> list[float]:
        headers = {"content-type": "application/json"}
        if api_key:
            headers["authorization"] = f"Bearer {api_key}"
        with httpx.Client(timeout=120.0) as client:
            res = client.post(
                join_url(base_url, "/embeddings"),
                headers=headers,
                json={"model": model, "input": text, "dimensions": dimensions},
            )
            if res.status_code != 200:
                raise RuntimeError(f"Embeddings failed: {res.status_code} {res.text}")
            data: dict[str, Any] = res.json()
            rows = data.get("data") or []
            if not rows:
                raise RuntimeError("Empty embedding from API")
            emb = rows[0].get("embedding")
            if not emb or not isinstance(emb, list):
                raise RuntimeError("Empty embedding from API")
            return [float(x) for x in emb]

    return with_retries(call, attempts=4, base_ms=300, max_ms=8000)


def openai_compatible_chat(
    base_url: str,
    api_key: str | None,
    model: str,
    messages: list[dict[str, str]],
) -> str:
    def call() -> str:
        headers = {"content-type": "application/json"}
        if api_key:
            headers["authorization"] = f"Bearer {api_key}"
        with httpx.Client(timeout=300.0) as client:
            res = client.post(
                join_url(base_url, "/chat/completions"),
                headers=headers,
                json={"model": model, "messages": messages, "temperature": 0.2},
            )
            if res.status_code != 200:
                raise RuntimeError(
                    f"Chat completions failed: {res.status_code} {res.text}"
                )
            data = res.json()
            choices = data.get("choices") or []
            if not choices:
                return ""
            msg = choices[0].get("message") or {}
            return str(msg.get("content") or "")

    return with_retries(call, attempts=4, base_ms=300, max_ms=8000)
