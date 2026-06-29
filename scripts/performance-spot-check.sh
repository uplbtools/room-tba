#!/usr/bin/env bash
# Quick performance spot-check for local dev (#263).
# Run after build: ./scripts/performance-spot-check.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== Performance spot-check ==="

# Check bundle sizes
echo "\n--- Client bundle sizes ---"
find dist/client -name "*.js" -o -name "*.css" | while read -r f; do
  size=$(wc -c < "$f")
  kb=$((size / 1024))
  if [ "$kb" -gt 500 ]; then
    echo "  WARNING: $(basename "$f") = ${kb}KB (large)"
  else
    echo "  $(basename "$f") = ${kb}KB"
  fi
done

# Check for source maps in production
echo "\n--- Source maps check ---"
map_count=$(find dist/client -name "*.map" | wc -l)
if [ "$map_count" -gt 0 ]; then
  echo "  WARNING: $map_count source map files in dist/client"
else
  echo "  OK: no source maps in production build"
fi

# Check image sizes
echo "\n--- Large images check ---"
find public -type f \( -name "*.png" -o -name "*.jpg" -o -name "*.jpeg" \) | while read -r f; do
  size=$(wc -c < "$f")
  kb=$((size / 1024))
  if [ "$kb" -gt 200 ]; then
    echo "  WARNING: $(basename "$f") = ${kb}KB (large)"
  fi
done

echo "\n=== Done ==="
