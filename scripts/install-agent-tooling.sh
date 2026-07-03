#!/usr/bin/env bash
# Install personal Caveman skill for Cursor (repo rules are already committed).
set -euo pipefail

echo "Installing Caveman for Cursor (personal skill)..."
npx --yes skills add JuliusBrussee/caveman -a cursor

echo ""
echo "Done. Installed to .agents/skills/ (gitignored)."
echo "Repo rules (committed):"
echo "  .cursor/rules/ponytail.mdc"
echo "  .cursor/rules/agent-contract.mdc"
echo "  .cursor/rules/caveman-default.mdc"
echo "Docs: docs/agent-tooling.md"
echo ""
echo "Optional — Claude Code + Codex plugins (slash commands, hooks):"
echo "  bun run install:agent-plugins"
