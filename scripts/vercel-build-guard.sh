#!/usr/bin/env bash
# Run Vercel-only build guards before astro build.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ "${VERCEL:-}" != "1" ]]; then
  exit 0
fi

echo "Running Vercel build guards…"
./scripts/check-vercel-env.sh

if [[ "${VERCEL_ENV:-}" == "production" ]]; then
  ./scripts/check-production-branch.sh
fi
