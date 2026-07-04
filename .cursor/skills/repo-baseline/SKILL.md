---
name: repo-baseline
description: Default workflow for smmariquit repositories. Use at the start of any task — read README, match conventions, minimal diffs, no secrets in commits, verify before redoing infra work. Check for stack-specific skills in this repo (.cursor/skills/).
---

# Repo baseline

## Start of task

1. Read `README.md` (and `CONTRIBUTING.md` if present).
2. List `.cursor/skills/` — load any skill that matches the task.
3. Check `package.json` / `pyproject.toml` / `Cargo.toml` for scripts before inventing commands.

## While working

- Reuse existing functions and patterns; don't reimplement parallel utilities.
- Prefer extending current abstractions over new files.
- Comments only for non-obvious logic.

## Git

- Commit only when asked.
- No `--no-verify` unless the user explicitly requests it.
- Don't amend pushed commits unless the user asks.

## Cross-repo infra

If the task touches Cloudflare, Vercel, or DNS across multiple repos, check `smmariquit/tutorials` for `MIGRATION-HANDOFF.md` and `MIGRATION-STATUS.md` before redoing migration work.

## MCP vs shell

For Cloudflare or Vercel tasks: try the enabled MCP tools first (after auth). Fall back to `gh`, `wrangler`, or `curl` if MCP lacks scope or returns auth errors — report which path was used.
