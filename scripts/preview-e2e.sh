#!/usr/bin/env bash
# Start E2E preview against an existing node-adapter build (run build:e2e first).
set -euo pipefail

cd "$(dirname "$0")/.."

HOST="${PLAYWRIGHT_HOST:-127.0.0.1}"
PORT="${PLAYWRIGHT_PORT:-4321}"

# Astro preview (node) does not load .env.local; map E2E_* → runtime vars.
while IFS= read -r line; do
  case "$line" in
    export\ *) eval "$line" ;;
  esac
done < <(bun run scripts/e2e-preview-env.ts)

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "Missing DATABASE_URL for E2E preview." >&2
  echo "Set E2E_DATABASE_URL (and E2E_ADMIN_PASSWORD) in .env.local — see .env.example." >&2
  exit 1
fi

exec env ASTRO_E2E_NODE=1 bunx astro preview --host "$HOST" --port "$PORT"
