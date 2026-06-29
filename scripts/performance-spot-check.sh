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

# Check total JS payload
echo "\n--- Total JS payload ---"
total_js=$(find dist/client -name "*.js" | xargs wc -c | tail -1 | awk '{print $1}')
total_js_kb=$((total_js / 1024))
echo "  Total JS: ${total_js_kb}KB"
if [ "$total_js_kb" -gt 2000 ]; then
  echo "  WARNING: total JS exceeds 2MB"
fi

# Check for uncompressed assets
echo "\n--- Compression check ---"
find dist/client -name "*.js" -o -name "*.css" | head -5 | while read -r f; do
  gz=$(gzip -9 -c "$f" | wc -c)
  orig=$(wc -c < "$f")
  ratio=$((100 * gz / orig))
  echo "  $(basename "$f"): ${ratio}% of original after gzip"
done

# Check API health if server is running
echo "\n--- API health ---"
if curl -sf http://localhost:4321/api/health > /dev/null 2>&1; then
  echo "  /api/health reachable"
else
  echo "  SKIP: dev server not running (run 'bun dev' first to check latency)"
fi

echo "\n=== Done ==="
