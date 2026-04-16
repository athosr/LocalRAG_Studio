"""Pydantic models aligned with @localrag/config AppSettings and API payloads."""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class OllamaSettings(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    host: str = Field(default="http://127.0.0.1:11434")
    chat_model: str = Field(alias="chatModel", default="llama3.2")
    embed_model: str = Field(alias="embedModel", default="nomic-embed-text")


class CustomHttpSettings(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    base_url: str = Field(alias="baseUrl")
    model: str
    embed_model: str = Field(alias="embedModel", default="text-embedding-3-small")


class RagSettings(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    top_k: int = Field(alias="topK", default=5, ge=1, le=50)
    chunk_size: int = Field(alias="chunkSize", default=1200, ge=200, le=8000)
    chunk_overlap: int = Field(alias="chunkOverlap", default=200, ge=0, le=500)
    embedding_dimensions: int = Field(
        alias="embeddingDimensions", default=768, ge=64, le=4096
    )


class AppSettingsPayload(BaseModel):
    """JSON shape from Electron settings.json (camelCase)."""

    model_config = ConfigDict(populate_by_name=True)

    active_provider: Literal["ollama", "custom_http"] = Field(alias="activeProvider")
    ollama: OllamaSettings = Field(default_factory=OllamaSettings)
    custom_http: CustomHttpSettings = Field(
        alias="customHttp",
        default_factory=lambda: CustomHttpSettings(
            baseUrl="https://api.openai.com/v1",
            model="gpt-4o-mini",
            embedModel="text-embedding-3-small",
        ),
    )
    rag: RagSettings = Field(default_factory=RagSettings)


class AskBody(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    question: str = Field(min_length=1, max_length=8000)
    settings: AppSettingsPayload
    api_key: str | None = Field(default=None, alias="apiKey")


class RagCitation(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    ref_index: int = Field(alias="refIndex")
    chunk_id: str = Field(alias="chunkId")
    document_id: str = Field(alias="documentId")
    title: str
    chunk_index: int = Field(alias="chunkIndex")
    excerpt: str


class RagAnswer(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    text: str
    citations: list[RagCitation]
    other_retrieved: list[RagCitation] = Field(alias="otherRetrieved")


class IngestOk(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    ok: Literal[True] = True
    document_id: str = Field(alias="documentId")
    deduped: bool


class IngestErr(BaseModel):
    model_config = ConfigDict(populate_by_name=True)

    ok: Literal[False] = False
    error: str
