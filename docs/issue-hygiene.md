# GitHub Issue Hygiene

Issues in this repo often contain **implementation specifics** — file paths, table names, API routes, acceptance checklists, and design decisions. When agents ship code quickly, those details go stale within days. Treat issues as living specs, not write-once tickets.

Use `gh issue view <n> --repo uplbtools/room-tba` before and after issue-scoped work.

## When to update an issue

| Moment                      | Action                                                                                                                                                       |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Starting work** on `#NNN` | Re-read the issue; grep the codebase for paths/APIs cited in the body. If anything moved or shipped already, edit the issue first (or note what's obsolete). |
| **Mid-implementation**      | If you change the agreed approach (different script name, schema shape, UI surface), update the issue body — don't only reflect it in code.                  |
| **Opening a PR**            | Comment on `#NNN` with the PR link and a one-line status. Use `Closes #NNN` / `Refs #NNN` in the PR body when appropriate.                                   |
| **Before merge**            | Check off completed acceptance criteria in the issue. Update file paths, env vars, and commands to match what actually merged.                               |
| **After merge**             | Close the issue if scope is fully delivered. Otherwise trim done items, add a **Remaining** section, and file spin-off issues for deferred work.             |
| **Discovering drift**       | If you find an issue describing code that no longer exists, fix the issue even when you're working on something else (quick edit + `Last verified` date).    |

## What to keep current

Priority order when editing an issue body:

1. **Acceptance criteria** — checkboxes reflect reality (`[x]` done, `[ ]` still open).
2. **Implementation pointers** — paths (`src/...`, `drizzle/...`), CLI commands, env vars, table/column names.
3. **Status header** — short line at the top: `Status: in progress | blocked | partially shipped | done`.
4. **Last verified** — `Last verified against staging: YYYY-MM-DD (@commit or PR #)` so the next agent knows whether to re-audit.
5. **Related links** — PRs, parent/child issues, docs that replaced the spec.

Do **not** delete historical context — strike through or move obsolete paragraphs under `## Superseded` instead of erasing decisions.

## Issue comment vs body edit

- **Comments:** progress pings, PR links, questions, blockers needing human input.
- **Body edits:** anything the next implementer must trust (paths, AC, commands, schema).

## Agent session checklist (issue-linked work)

1. `gh issue view N --json title,body,state,labels`
2. Verify cited files/routes exist; update issue if not.
3. Implement; commit with `type(scope): summary (refs #N)` when tied to an issue.
4. Update issue AC + `Last verified` before or immediately after opening the PR.
5. PR description lists which AC items this PR satisfies and which remain.

## Examples of drift (fix these when you see them)

- Issue says `src/seed-classes.ts` + `info.db` but runtime is Supabase + `scripts/import-….ts`.
- Issue references `#203` as "current PR" but multi-user auth already merged.
- Checklist items duplicated in a parent issue and sub-issues — parent should point to children, not repeat stale AC.
- Open design questions that were decided in code but never marked resolved in the issue.

## Non-goals

- Rewriting every open issue in one pass.
- Long narrative changelogs in issue bodies — link to PR/`CHANGELOG.md` instead.
- Closing issues without verifying AC because "we probably done that."
