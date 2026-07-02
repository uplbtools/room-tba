#!/usr/bin/env bash
# Build with @astrojs/node (preview-capable) and serve for Playwright / integration.
set -euo pipefail

cd "$(dirname "$0")/.."

if [[ "${SKIP_E2E_BUILD:-}" != "1" ]]; then
  echo "E2E: building with node adapter (Vercel adapter cannot astro preview)…"
  ASTRO_E2E_NODE=1 bun run build
fi

exec bash scripts/preview-e2e.sh
