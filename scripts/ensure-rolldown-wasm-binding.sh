#!/usr/bin/env bash
# bun silently fails to extract @rolldown/binding-wasm32-wasi (the npm/cli#4828
# class of optional-dependency bug): it logs "installed" but never writes the
# package to node_modules. Vercel's runtime falls through to this exact
# binding before trying the native one, so every route 500s with "Cannot find
# native binding" without it. Fetch it from the registry by hand if missing.
set -euo pipefail

DEST="node_modules/@rolldown/binding-wasm32-wasi"
VERSION="1.1.3"

if [ -f "$DEST/rolldown-binding.wasi.cjs" ]; then
  echo "rolldown wasm32-wasi binding already present, skipping fetch"
  exit 0
fi

echo "Fetching @rolldown/binding-wasm32-wasi@$VERSION (bun optional-dep bug workaround)"
mkdir -p "$DEST"
curl -sL "https://registry.npmjs.org/@rolldown/binding-wasm32-wasi/-/binding-wasm32-wasi-$VERSION.tgz" \
  -o /tmp/rolldown-wasm.tgz
tar -xzf /tmp/rolldown-wasm.tgz -C "$DEST" --strip-components=1
rm -f /tmp/rolldown-wasm.tgz
echo "rolldown wasm32-wasi binding installed"
