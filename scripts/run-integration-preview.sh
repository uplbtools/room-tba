#!/usr/bin/env bash
# Build (optional), start E2E preview, run integration tests — mirrors CI blocking job.
set -euo pipefail

cd "$(dirname "$0")/.."

PREVIEW_URL="${PREVIEW_BASE_URL:-http://127.0.0.1:4321}"

if [[ "${SKIP_E2E_BUILD:-}" != "1" ]]; then
  bun run build:e2e
fi

started_preview=0
if curl -sf "${PREVIEW_URL}/api/health" >/dev/null 2>&1; then
  echo "Reusing preview already listening on ${PREVIEW_URL}"
else
  bun run preview:e2e &
  preview_pid=$!
  started_preview=1
  cleanup() {
    if [[ "$started_preview" -eq 1 ]]; then
      kill "$preview_pid" 2>/dev/null || true
    fi
  }
  trap cleanup EXIT

  for i in $(seq 1 60); do
    if curl -sf "${PREVIEW_URL}/api/health" >/dev/null; then
      break
    fi
    if [[ "$i" -eq 60 ]]; then
      echo "Preview failed to start at ${PREVIEW_URL}"
      exit 1
    fi
    sleep 2
  done
fi

PREVIEW_BASE_URL="${PREVIEW_URL}" bun run test:integration
