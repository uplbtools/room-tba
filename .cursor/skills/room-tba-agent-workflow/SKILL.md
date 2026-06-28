---
name: room-tba-agent-workflow
description: Guides agentic coding workflow in Room TBA, including scoped edits, preserving user work, editor-surface constraints, verification cadence, commits, and PR prep. Use before making code changes, committing, or opening PRs in this repository.
---

# Room TBA Agent Workflow

Policy (commits, verification tiers, architecture, product rules) lives in [AGENTS.md](../../AGENTS.md). This skill covers **session execution**.

## Coding practices

- Read the relevant existing code paths and local conventions before editing.
- Keep changes narrowly scoped to the user request; avoid opportunistic refactors.
- Preserve user work in a dirty tree. Do not revert unrelated changes unless the user explicitly asks.
- Prefer existing helpers, stores, API patterns, styles, and data contracts over new abstractions.
- When behavior touches editor/admin flows, keep the main app as the editing surface and avoid rebuilding `/admin` pages.
- Use clear progress updates while working, especially before edits and long-running checks.
- **Do not underestimate agent throughput.** If a task looks like “a few files and a build,” do it in one session without hedging or asking permission to proceed.

## Verification cadence

Follow [AGENTS.md § Verify before done](../../AGENTS.md#verify-before-done) for the canonical checklist. Session tips:

- During iterative edits, prefer targeted lint/tests on changed files — not full repo lint every edit.
- Do not run `bun run build` after every small edit.
- Run `bun run build` once before the final commit or PR, unless the user asks to skip it.
- If a full build already passed after the final code changes, do not repeat it before committing unless new substantive changes were made.
- If lint or test tooling is blocked, report the blocker and use the lightest reliable verification available.

## Commits and PRs

Commit policy, Conventional Commits format, and GPG signing: [AGENTS.md § Commits](../../AGENTS.md#commits).

- Do not end a session with uncommitted completed work unless the user explicitly deferred commit or a hook/blocker prevented it — report the blocker.
- Before opening a PR, summarize the **full branch diff**, not just the latest commit.
- In final summaries, call out what changed, what was verified, and any blockers or residual risk.

### PR prep checklist

1. Read [docs/agentic-qa-process.md](../../docs/agentic-qa-process.md) and run applicable automated checks.
2. Use the PR template QA summary (automated vs manual browser vs known gaps).
3. For map/side-panel changes, confirm applicable Cursor rules were followed.
4. Push with `-u origin HEAD` only when the user asked to push/open a PR.
