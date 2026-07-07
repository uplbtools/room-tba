#!/usr/bin/env bash
# Install recommended skills catalog (aisles 1–4). Idempotent.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== Aisle 1: workflow (project) ==="
npx --yes skills add obra/superpowers \
  -s systematic-debugging -s verification-before-completion \
  -s using-git-worktrees -s finishing-a-development-branch \
  -a cursor -y

echo "=== Aisle 2: stack (project) ==="
npx --yes skills add currents-dev/playwright-best-practices-skill -a cursor -y
npx --yes skills add sveltejs/ai-tools \
  -s svelte-code-writer -s svelte-core-bestpractices -a cursor -y
npx --yes skills add vercel-labs/agent-skills -s web-design-guidelines -a cursor -y

echo "=== Aisle 3: anti-slop (global — all repos) ==="
npx --yes skills add JuliusBrussee/skills \
  -s fuck-slop -s context-canary -s grill-me -s junior-to-senior \
  -a cursor -g -y

echo "=== Aisle 4: UI (project) ==="
npx --yes skills add JuliusBrussee/skills -s interface-kit -a cursor -y

echo ""
echo "Done. Project skills → .agents/skills/ (gitignored; restore via skills-lock.json)"
echo "Global skills → ~/.agents/skills/"
echo "List: npx skills ls"
