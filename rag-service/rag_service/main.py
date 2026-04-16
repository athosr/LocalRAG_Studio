from __future__ import annotations

import os
from contextlib import asynccontextmanager

from fastapi import FastAPI

from rag_service.api.routes import router
from rag_service.db.pool import init_pool, shutdown_pool


@asynccontextmanager
async def lifespan(app: FastAPI):
    dsn = os.environ.get("DATABASE_URL", "").strip()
    if not dsn:
        raise RuntimeError("DATABASE_URL is required")
    init_pool(dsn)
    try:
        yield
    finally:
        shutdown_pool()


def create_app() -> FastAPI:
    app = FastAPI(title="LocalRAG rag-service", lifespan=lifespan)
    app.include_router(router)
    return app


app = create_app()
