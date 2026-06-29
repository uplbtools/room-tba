#!/usr/bin/env bash
# Resubmit sitemap to Google Search Console after a release.
# Requires GSC_SITEMAP_URL env var (e.g. https://room-tba.uplbtools.me/sitemap-index.xml).
set -euo pipefail

if [[ -z "${GSC_SITEMAP_URL:-}" ]]; then
  echo "GSC_SITEMAP_URL is not set. Skipping sitemap resubmission."
  exit 0
fi

echo "Resubmitting sitemap to Google Search Console: $GSC_SITEMAP_URL"

# Ping Google with the sitemap URL
curl -sS "https://www.google.com/ping?sitemap=$GSC_SITEMAP_URL" || true

echo "Sitemap resubmission complete."
