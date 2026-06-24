---
name: room-tba-agent-workflow
description: Guides agentic coding workflow in Room TBA, including scoped edits, preserving user work, editor-surface constraints, verification cadence, commits, and PR prep. Use before making code changes, committing, or opening PRs in this repository.
---

# Room TBA Agent Workflow

## Coding Practices

- Read the relevant existing code paths and local conventions before editing.
- Keep changes narrowly scoped to the user request; avoid opportunistic refactors.
- Preserve user work in a dirty tree. Do not revert unrelated changes unless the user explicitly asks.
- Prefer existing helpers, stores, API patterns, styles, and data contracts over new abstractions.
- When behavior touches editor/admin flows, keep the main app as the editing surface and avoid rebuilding `/admin` pages.
- Use clear progress updates while working, especially before edits and long-running checks.

## Verification Cadence

- During iterative edits, prefer focused checks such as formatting, targeted type/lint checks, or relevant tests for the files changed.
- Do not run `bun run build` after every small edit.
- Run `bun run build` once before the final commit or before opening/updating a PR, unless the user explicitly asks to skip it or run it earlier.
- If a full build was already run after the final code changes, do not repeat it before committing unless new substantive changes are made.
- If lint or test tooling is blocked by repository configuration, report the blocker and use the lightest reliable verification available.

## Commits And PRs

- Make small, reviewable commits when the user asks for commits or a PR.
- Before opening a PR, summarize the full branch diff, not just the latest commit.
- In final summaries, call out what changed, what was verified, and any blockers or residual risk.
