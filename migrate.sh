#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

echo "[LocalRAG Studio] Database migrations"
echo

if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: Node.js was not found. Install Node.js 24 or newer."
  exit 1
fi

if ! node -e "const [m]=process.versions.node.split('.'); process.exit(+m<24?1:0)" 2>/dev/null; then
  echo "ERROR: Node.js 24 or newer is required. You have:"
  node -v
  exit 1
fi

if [[ ! -d node_modules ]]; then
  echo "ERROR: Dependencies are missing. Run ./setup.sh first."
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: Docker was not found. Install Docker and ensure it is on PATH."
  exit 1
fi

echo "Ensuring Postgres container is running ..."
docker compose up -d

waitcount=0
until docker compose exec -T db pg_isready -U rag -d ragstudio >/dev/null 2>&1; do
  waitcount=$((waitcount + 1))
  if [[ "$waitcount" -ge 60 ]]; then
    echo "ERROR: Postgres did not become ready in time. Try: docker compose logs db"
    echo "If you changed the host port in docker-compose.yml, set DATABASE_URL in .env to match."
    exit 1
  fi
  sleep 2
done

if command -v pnpm >/dev/null 2>&1; then
  exec pnpm run db:migrate
else
  exec npx --yes pnpm@10.33.0 run db:migrate
fi
