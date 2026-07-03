#!/usr/bin/env bash
# Install Ponytail + Caveman plugins for Claude Code and Codex (user scope).
# Repo rules ship with git; this script is for slash commands + lifecycle hooks.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

install_claude() {
  if ! command -v claude >/dev/null 2>&1; then
    echo "skip claude: not on PATH"
    return 0
  fi
  echo "Claude Code: ponytail + caveman marketplaces..."
  claude plugin marketplace add DietrichGebert/ponytail 2>/dev/null || true
  claude plugin install ponytail@ponytail
  claude plugin marketplace add JuliusBrussee/caveman 2>/dev/null || true
  claude plugin install caveman@caveman
  echo "Claude: installed ponytail@ponytail, caveman@caveman (user scope)"
}

install_codex() {
  if ! command -v codex >/dev/null 2>&1; then
    echo "skip codex: not on PATH"
    return 0
  fi
  echo "Codex: ponytail marketplace..."
  codex plugin marketplace add https://github.com/DietrichGebert/ponytail.git 2>/dev/null || true
  codex plugin add ponytail@ponytail
  echo "Codex: installed ponytail@ponytail"
  echo "Note: Caveman on Codex uses repo .agents/skills/ (bun run install:agent-tooling) or \$caveman prefix."
}

echo "=== Room TBA agent plugins ==="
install_claude
install_codex
echo ""
echo "Cursor: bun run install:agent-tooling (Caveman skills) + committed .cursor/rules/*"
echo "Docs: docs/agent-tooling.md"
