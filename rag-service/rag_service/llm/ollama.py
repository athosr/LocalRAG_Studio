from __future__ import annotations

from typing import Any

import httpx

from rag_service.llm.retry import with_retries


def join_url(base: str, path: str) -> str:
    return base.rstrip("/") + path


def ollama_list_models(host: str) -> list[str]:
    with httpx.Client(timeout=30.0) as client:
        res = client.get(join_url(host, "/api/tags"))
        if res.status_code != 200:
            raise RuntimeError(f"Ollama list models failed: {res.status_code}")
        data = res.json()
        models = data.get("models") or []
        return [str(m.get("name") or "") for m in models if m.get("name")]


def ollama_embed(host: str, model: str, prompt: str) -> list[float]:
    def call() -> list[float]:
        with httpx.Client(timeout=120.0) as client:
            res = client.post(
                join_url(host, "/api/embeddings"),
                json={"model": model, "prompt": prompt},
                headers={"content-type": "application/json"},
            )
            if res.status_code != 200:
                hint = (
                    f" If the model is missing, run: ollama pull {model}"
                    if res.status_code == 404
                    else ""
                )
                raise RuntimeError(
                    f"Ollama embeddings failed: {res.status_code} {res.text}{hint}"
                )
            data: dict[str, Any] = res.json()
            emb = data.get("embedding")
            if not emb or not isinstance(emb, list):
                raise RuntimeError("Ollama returned empty embedding")
            return [float(x) for x in emb]

    return with_retries(call, attempts=4, base_ms=200, max_ms=5000)


def ollama_chat(host: str, model: str, messages: list[dict[str, str]]) -> str:
    def call() -> str:
        with httpx.Client(timeout=300.0) as client:
            res = client.post(
                join_url(host, "/api/chat"),
                json={"model": model, "messages": messages, "stream": False},
                headers={"content-type": "application/json"},
            )
            if res.status_code != 200:
                hint = (
                    f" If the model is missing, run: ollama pull {model}"
                    if res.status_code == 404
                    else ""
                )
                raise RuntimeError(
                    f"Ollama chat failed: {res.status_code} {res.text}{hint}"
                )
            data = res.json()
            msg = data.get("message") or {}
            return str(msg.get("content") or "")

    return with_retries(call, attempts=4, base_ms=200, max_ms=5000)
