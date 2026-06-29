#!/usr/bin/env bash
# Validate that required Vercel environment variables are set.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

REQUIRED=(
  "DATABASE_URL"
  "SUPABASE_URL"
  "SUPABASE_ANON_KEY"
)

MISSING=0
for var in "${REQUIRED[@]}"; do
  if [[ -z "${!var:-}" ]]; then
    echo "MISSING: $var"
    MISSING=1
  fi
done

if [[ "$MISSING" -eq 1 ]]; then
  echo ""
  echo "Some required Vercel env vars are not set."
  echo "Set them with: vercel env add <name> [production|preview|development]"
  exit 1
fi

echo "Vercel environment check passed."
