#!/usr/bin/env bash
# Remove workspace build artifacts (same intent as clean-workspace.ps1).
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

find . -depth -name node_modules -type d -exec rm -rf {} \; 2>/dev/null || true

if [[ -d packages ]]; then
  find packages -depth -name dist -type d -exec rm -rf {} \; 2>/dev/null || true
fi

[[ -d apps/desktop/out ]] && rm -rf apps/desktop/out
[[ -d .turbo ]] && rm -rf .turbo
[[ -f .env ]] && rm -f .env
