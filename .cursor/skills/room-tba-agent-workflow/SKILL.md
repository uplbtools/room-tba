---
name: room-tba-agent-workflow
description: Guides agentic coding workflow in Room TBA, including scoped edits, preserving user work, editor-surface constraints, verification cadence, commits, and PR prep. Use before making code changes, committing, or opening PRs in this repository.
---

# Room TBA Agent Workflow

Policy (commits, verification tiers, architecture, product rules) lives in [AGENTS.md](../../AGENTS.md). This skill covers **session execution**.

Domain skills (read when the task matches): [contributor-proposals](../contributor-proposals/SKILL.md), [discord-notifications](../discord-notifications/SKILL.md), [amis-term-import](../amis-term-import/SKILL.md), [vercel-supabase-ops](../vercel-supabase-ops/SKILL.md), [playwright-e2e-ci](../playwright-e2e-ci/SKILL.md).

## Coding practices

- Read the relevant existing code paths and local conventions before editing.
- Keep changes narrowly scoped to the user request; avoid opportunistic refactors.
- Preserve user work in a dirty tree. Do not revert unrelated changes unless the user explicitly asks.
- Prefer existing helpers, stores, API patterns, styles, and data contracts over new abstractions.
- When behavior touches editor/admin flows, keep the main app as the editing surface and avoid rebuilding `/admin` pages.
- Use clear progress updates while working, especially before edits and long-running checks.
- **Do not underestimate agent throughput.** If a task looks like “a few files and a build,” do it in one session without hedging or asking permission to proceed.

## Verification cadence

Follow [AGENTS.md § Verify before done](../../AGENTS.md#verify-before-done) and [§ Tests with GitHub issues](../../AGENTS.md#tests-with-github-issues) for the canonical checklist. Session tips:

- **Issue-linked work:** add tests in the same PR — see [docs/issue-test-matrix.md](../../docs/issue-test-matrix.md). **Do not defer** test/spec/issue-AC work to a follow-up turn when unblocked.
- **Do not end with optional next steps** you could execute now — see [AGENTS.md § Do not defer executable work](../../AGENTS.md#do-not-defer-executable-work).

- During iterative edits, prefer targeted lint/tests on changed files; not full repo lint every edit.
- Do not run `bun run build` after every small edit.
- Run `bun run build` once before the final commit or PR, unless the user asks to skip it.
- If a full build already passed after the final code changes, do not repeat it before committing unless new substantive changes were made.
- If lint or test tooling is blocked, report the blocker and use the lightest reliable verification available.

## README sync (mandatory)

`AGENTS.md` § **README sync** is not optional. Treat README drift as a merge blocker.

- **Same PR:** env vars, scripts, stack versions, CI, URLs, editor entry points, or user-facing features → update `README.md` (and `.env.example` when adding env vars) in the same change set.
- **Before commit/PR:** run `bun run check:readme` after any of the above, or after editing README.
- **Do not** ship “fix README later” — the check script catches common stale lies (Neon, `info.db` as runtime DB, `/src/routes`, `npm install`, wrong Astro major).

## Commits and PRs

Commit policy, Conventional Commits format, and GPG signing: [AGENTS.md § Commits](../../AGENTS.md#commits).

- Do not end a session with uncommitted completed work unless the user explicitly deferred commit or a hook/blocker prevented it; report the blocker.
- Before opening a PR, summarize the **full branch diff**, not just the latest commit.
- In final summaries, call out what changed, what was verified, and any blockers or residual risk.

### PR prep checklist

1. Read [docs/agentic-qa-process.md](../../docs/agentic-qa-process.md) and run applicable automated checks.
2. Use the PR template QA summary (automated vs manual browser vs known gaps).
3. For map/side-panel changes, confirm applicable Cursor rules were followed.
4. **Issue sync:** for each linked `#NNN`, update AC/paths/status per [docs/issue-hygiene.md](../../docs/issue-hygiene.md); comment with the PR URL.
5. Push with `-u origin HEAD` only when the user asked to push/open a PR.
6. **Base branch:** feature work → `staging`. "PR to main" / prod ship → `staging` → `main` release only ([AGENTS.md § Branches and pull requests](../../AGENTS.md#branches-and-pull-requests)). Direct push to `staging` when the user asks — see [§ Worktrees and multiple agents](../../AGENTS.md#worktrees-and-multiple-agents).
7. **`data` / `qa` issues:** reporter does not PR; implement and link the PR on the issue.

## Heavy CI (integration + E2E)

Read [docs/testing.md § Heavy CI gating](../../docs/testing.md#heavy-ci-gating-prs) and [AGENTS.md § Heavy CI gating](../../AGENTS.md#heavy-ci-gating-integration--e2e).

- **Every push (incl. drafts):** verify + migrations only.
- **Ready for review:** integration + blocking E2E in **one job** (shared preview), plus advisory E2E + bundle advisory.
- **After fixes:** `run/e2e` label — ordinary pushes do not re-trigger.
- **Staging merge + nightly:** full blocking stack on `staging`.

```sh
gh pr ready <number>
bun run test:integration:live   # local, before ready, when touching APIs
bun run e2e                     # local, before ready, when touching UI
gh pr edit <number> --add-label run/e2e
```
