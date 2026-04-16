#!/usr/bin/env bash
# Full reset and install (same role as setup.bat). Homebrew (macOS or Linux) can install Node / Python when missing.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

echo "[LocalRAG Studio] Setup - full reset"
echo "This removes the Docker volume for this project, node_modules, package dist folders,"
echo "apps/desktop/out, and .env — then copies .env.example to .env again."
echo "On macOS with Homebrew, missing Node.js 24+ or Python 3.14 may be installed automatically."
echo "Then rag-service (pip), pnpm, and DB migrations run."
echo

ensure_node_24() {
  if command -v node >/dev/null 2>&1 && node -e "const [m]=process.versions.node.split('.'); process.exit(+m<24?1:0)" 2>/dev/null; then
    return 0
  fi
  if command -v brew >/dev/null 2>&1; then
    echo "Node.js 24+ not found. Installing Node.js via Homebrew ..."
    brew install node
  else
    echo "ERROR: Node.js 24+ not found. Install Node.js 24+ from https://nodejs.org or your package manager."
    exit 1
  fi
  if ! command -v node >/dev/null 2>&1 || ! node -e "const [m]=process.versions.node.split('.'); process.exit(+m<24?1:0)" 2>/dev/null; then
    echo "ERROR: Node.js 24+ is still not satisfied. You have: $(node -v 2>/dev/null || echo 'none')"
    exit 1
  fi
}

python_is_314_plus() {
  local cmd="$1"
  [[ -z "$cmd" ]] && return 1
  command -v "$cmd" >/dev/null 2>&1 || return 1
  "$cmd" -c "import sys; raise SystemExit(0 if sys.version_info[:2]>=(3,14) else 1)" 2>/dev/null
}

any_python_314_plus() {
  if [[ -n "${LOCALRAG_PYTHON:-}" ]] && python_is_314_plus "$LOCALRAG_PYTHON"; then
    return 0
  fi
  local c
  for c in python3.14 python3 python; do
    python_is_314_plus "$c" && return 0
  done
  return 1
}

ensure_python314() {
  if any_python_314_plus; then
    return 0
  fi
  if command -v brew >/dev/null 2>&1; then
    echo "Python 3.14+ not found. Installing python@3.14 via Homebrew ..."
    brew install python@3.14
    local bp
    bp="$(brew --prefix python@3.14 2>/dev/null || true)"
    if [[ -n "$bp" && -x "$bp/bin/python3.14" ]]; then
      export PATH="$bp/bin:$PATH"
    fi
  else
    echo "ERROR: Python 3.14+ not found. Install Python 3.14 from https://www.python.org or your package manager."
    echo "       Or install Homebrew (https://brew.sh) and re-run, or: brew install python@3.14"
    exit 1
  fi
  if ! any_python_314_plus; then
    echo "ERROR: Python 3.14 is not on PATH after install. Open a new terminal and run ./setup.sh again."
    exit 1
  fi
}

python314_finalize() {
  if [[ -n "${LOCALRAG_PYTHON:-}" ]]; then
    if ! python_is_314_plus "$LOCALRAG_PYTHON"; then
      echo "NOTE: LOCALRAG_PYTHON points to Python below 3.14; using another interpreter for this setup."
      unset LOCALRAG_PYTHON
    fi
  fi
}

load_localrag_python_from_env_file() {
  if [[ -n "${LOCALRAG_PYTHON:-}" ]] || [[ ! -f .env ]]; then
    return 0
  fi
  local line
  line="$(grep -E '^LOCALRAG_PYTHON=' .env 2>/dev/null | head -1 || true)"
  [[ -z "$line" ]] && return 0
  export LOCALRAG_PYTHON="${line#LOCALRAG_PYTHON=}"
  LOCALRAG_PYTHON="${LOCALRAG_PYTHON%$'\r'}"
}

install_rag_service_pip() {
  local py=""
  if [[ -n "${LOCALRAG_PYTHON:-}" ]] && python_is_314_plus "$LOCALRAG_PYTHON"; then
    py="$LOCALRAG_PYTHON"
  elif python_is_314_plus python3.14; then
    py="python3.14"
  elif python_is_314_plus python3; then
    py="python3"
  elif python_is_314_plus python; then
    py="python"
  else
    echo "ERROR: No Python 3.14+ interpreter found for pip install."
    exit 1
  fi
  echo "Installing rag-service Python dependencies (3.14+) with: $py"
  ( cd rag-service && "$py" -m pip install -e ".[dev]" )
}

ensure_node_24

if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: Docker was not found. Install Docker Desktop / Docker Engine and ensure docker is on PATH."
  exit 1
fi

if [[ ! -f .env.example ]]; then
  echo "ERROR: .env.example is missing. Restore it from the repository, then re-run ./setup.sh."
  exit 1
fi

echo "Stopping Docker Compose and removing volumes for this project ..."
docker compose down -v || echo "WARNING: docker compose down -v failed — Docker may be stopped. Continuing cleanup..."

echo "Deleting node_modules, build outputs, and .env ..."
bash "$ROOT/scripts/clean-workspace.sh"

echo "Creating fresh .env from .env.example ..."
cp -f .env.example .env

echo "Starting Docker Compose database ..."
docker compose up -d --build

echo "Waiting until Postgres in this Docker container accepts connections ..."
waitcount=0
until docker compose exec -T db pg_isready -U rag -d ragstudio >/dev/null 2>&1; do
  waitcount=$((waitcount + 1))
  if [[ "$waitcount" -ge 60 ]]; then
    echo "ERROR: Postgres did not become ready in time. Check: docker compose logs db"
    exit 1
  fi
  sleep 2
done

load_localrag_python_from_env_file
ensure_python314
python314_finalize
install_rag_service_pip

pnpm_cmd() {
  if command -v pnpm >/dev/null 2>&1; then
    pnpm "$@"
  else
    npx --yes pnpm@10.33.0 "$@"
  fi
}

echo "Installing dependencies with pnpm ..."
pnpm_cmd install
echo "Building workspace packages ..."
pnpm_cmd run build:packages
echo "Running database migrations ..."
if ! pnpm_cmd run db:migrate; then
  echo
  echo "MIGRATE FAILED - common causes:"
  echo "  1) DATABASE_URL in .env must use host port 5433: postgresql://rag:rag@127.0.0.1:5433/ragstudio"
  echo "  2) Another app using host port 5433 — change the mapped port in docker-compose.yml and .env to match."
  echo "  3) packages/db/dist missing — run: pnpm run build:packages"
  echo "  4) Docker not healthy — run: docker compose logs db"
  exit 1
fi

echo
echo "Setup finished from a clean state. Run ./run.sh to start the desktop app."
