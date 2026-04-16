# rag-service

Local FastAPI app for ingest, embeddings, vector search, and chat. Started by the Electron main process (or manually for debugging).

## Setup

Requires **Python 3.14**.

```bash
cd rag-service
python -m venv .venv
.venv\Scripts\activate   # Windows
pip install -e ".[dev]"
```

## Run (manual)

```bash
set DATABASE_URL=postgresql://rag:rag@127.0.0.1:5433/ragstudio
python -m uvicorn rag_service.main:app --host 127.0.0.1 --port 8787
```

Environment:

- `DATABASE_URL` — required
- `LOCALRAG_RAG_PORT` — default `8787` (when using `python -m rag_service` entry not used; uvicorn sets port)
- `LOCALRAG_PYTHON` — used by Electron, not this service
