#!/usr/bin/env bash
# Fail if attempting a production deploy from a non-main branch.
set -euo pipefail

CURRENT_BRANCH="${VERCEL_GIT_COMMIT_REF:-$(git branch --show-current 2>/dev/null || echo "unknown")}"

if [[ "${VERCEL_ENV:-}" != "production" ]]; then
  echo "Skipping production branch check (VERCEL_ENV=${VERCEL_ENV:-local})."
  exit 0
fi

if [[ "$CURRENT_BRANCH" != "main" ]]; then
  echo "ERROR: Production builds must deploy from the main branch."
  echo "Current branch: $CURRENT_BRANCH"
  echo "Merge staging → main first, then redeploy."
  exit 1
fi

echo "Production branch check passed ($CURRENT_BRANCH)."
