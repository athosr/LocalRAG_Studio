#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

echo "[LocalRAG Studio] Starting dev (Electron)"
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

if command -v pnpm >/dev/null 2>&1; then
  exec pnpm run dev
else
  exec npx --yes pnpm@10.33.0 run dev
fi
