from __future__ import annotations

from rag_service.contracts import AppSettingsPayload
from rag_service.llm import ollama, openai_compatible


def embed_text(
    settings: AppSettingsPayload,
    api_key: str | None,
    text: str,
) -> list[float]:
    if settings.active_provider == "ollama":
        return ollama.ollama_embed(
            settings.ollama.host,
            settings.ollama.embed_model,
            text,
        )
    return openai_compatible.openai_compatible_embed(
        settings.custom_http.base_url,
        api_key,
        settings.custom_http.embed_model,
        text,
        settings.rag.embedding_dimensions,
    )


def complete_chat(
    settings: AppSettingsPayload,
    api_key: str | None,
    messages: list[dict[str, str]],
) -> str:
    if settings.active_provider == "ollama":
        return ollama.ollama_chat(
            settings.ollama.host,
            settings.ollama.chat_model,
            messages,
        )
    return openai_compatible.openai_compatible_chat(
        settings.custom_http.base_url,
        api_key,
        settings.custom_http.model,
        messages,
    )
