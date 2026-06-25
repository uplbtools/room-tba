#!/usr/bin/env bash
# Fail if new position:fixed appears outside allowlisted map chrome files.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ALLOWLIST=(
  'src/components/svelte/Entry.svelte'
  'src/components/svelte/Map.svelte'
  'src/components/svelte/Toast.svelte'
  'src/components/svelte/modal/'
  'src/components/svelte/AdminLoginModal.svelte'
  'src/components/svelte/Building3DViewer.svelte'
)

cd "$ROOT"

matches=$(rg -l 'position:\s*fixed' src/components/svelte/ || true)

while IFS= read -r file; do
  [[ -z "$file" ]] && continue
  allowed=false
  for pattern in "${ALLOWLIST[@]}"; do
    if [[ "$file" == *"$pattern"* ]]; then
      allowed=true
      break
    fi
  done
  if [[ "$allowed" == false ]]; then
    echo "ERROR: position:fixed in non-allowlisted file: $file"
    echo "Add to scripts/check-map-chrome.sh allowlist only if intentional."
    exit 1
  fi
done <<< "$matches"

echo "Map chrome fixed-position check passed."
