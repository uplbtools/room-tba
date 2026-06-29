#!/usr/bin/env bash
# Validate that required Vercel environment variables are set and non-empty.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

REQUIRED=(
  "DATABASE_URL"
)

MISSING=0
for var in "${REQUIRED[@]}"; do
  value="${!var:-}"
  if [[ -z "${value// }" ]]; then
    echo "MISSING or empty: $var"
    MISSING=1
  fi
done

if [[ "$MISSING" -eq 1 ]]; then
  echo ""
  echo "Required Vercel env vars are missing or empty strings."
  echo "Set them with: vercel env add $var production --value \"\$DATABASE_URL\" --yes --force"
  echo "See AGENTS.md § Vercel CLI and environment ops."
  exit 1
fi

echo "Vercel environment check passed."
