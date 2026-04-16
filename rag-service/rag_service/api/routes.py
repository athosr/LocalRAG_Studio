from __future__ import annotations

import json
from typing import Annotated, Any

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import ValidationError

from rag_service.contracts import AppSettingsPayload, AskBody
from rag_service.llm import ollama as ollama_client
from rag_service.services import answer as answer_svc
from rag_service.services import ingest as ingest_svc

router = APIRouter()


@router.get("/health")
def health() -> dict[str, bool]:
    return {"ok": True}


@router.post("/v1/ingest")
async def ingest(
    file: Annotated[UploadFile, File()],
    settings: Annotated[str, Form()],
    api_key: Annotated[str | None, Form()] = None,
    source_path: Annotated[str | None, Form()] = None,
) -> dict[str, Any]:
    try:
        cfg = AppSettingsPayload.model_validate(json.loads(settings))
    except (json.JSONDecodeError, ValidationError) as e:
        raise HTTPException(status_code=400, detail=str(e)) from e

    raw = await file.read()
    file_name = file.filename or "file"
    result = ingest_svc.ingest_file(
        buffer=raw,
        file_name=file_name,
        source_path=source_path,
        settings=cfg,
        api_key=api_key.strip() if api_key and api_key.strip() else None,
    )
    return result


@router.post("/v1/ask")
def ask(body: AskBody) -> dict[str, Any]:
    key = body.api_key.strip() if body.api_key and body.api_key.strip() else None
    try:
        return answer_svc.answer_question(
            question=body.question,
            settings=body.settings,
            api_key=key,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.get("/v1/ollama/models")
def list_ollama_models(host: str) -> dict[str, list[str]]:
    try:
        names = ollama_client.ollama_list_models(host)
        return {"models": names}
    except Exception as e:
        raise HTTPException(status_code=502, detail=str(e)) from e
