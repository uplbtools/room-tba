# Room TBA Agent Guide

**Human developers and campus volunteers:** start with [CONTRIBUTING.md](CONTRIBUTING.md). You do not need this file.

> **Org template:** Other [uplbtools](https://github.com/uplbtools) repos maintain a shorter `AGENTS.md` adapted from this file for their stack (discord-bot, gradesim, uplbtools.me, punta, iskedyul, laro-tayo, …).

## Doc map

Read the right doc for the task; do not rely on this file alone for detailed checklists.

| When                                              | Read                                                                                                                                           |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Human volunteers, developers (default)            | [CONTRIBUTING.md](CONTRIBUTING.md)                                                                                                             |
| Developer setup detail                            | [docs/developer-guide.md](docs/developer-guide.md)                                                                                             |
| Starting a coding session, commit, or PR          | [.cursor/skills/room-tba-agent-workflow/SKILL.md](.cursor/skills/room-tba-agent-workflow/SKILL.md)                                             |
| Agent handoff to another session / model          | [.cursor/skills/agent-handoff/SKILL.md](.cursor/skills/agent-handoff/SKILL.md)                                                                 |
| Caveman, Ponytail, token efficiency, Claude/Codex | [docs/agent-tooling.md](docs/agent-tooling.md) + [docs/agent-contract.md](docs/agent-contract.md)                                              |
| Contributor proposals, review queue, suggest edit | [.cursor/skills/contributor-proposals/SKILL.md](.cursor/skills/contributor-proposals/SKILL.md)                                                 |
| Discord notifications (room-tba + discord-bot)    | [.cursor/skills/discord-notifications/SKILL.md](.cursor/skills/discord-notifications/SKILL.md)                                                 |
| AMIS class import, term_id triage                 | [.cursor/skills/amis-term-import/SKILL.md](.cursor/skills/amis-term-import/SKILL.md)                                                           |
| Vercel env, deploy guards, Supabase migrations    | [.cursor/skills/vercel-supabase-ops/SKILL.md](.cursor/skills/vercel-supabase-ops/SKILL.md)                                                     |
| Playwright E2E, integration CI, `run/e2e` label   | [.cursor/skills/playwright-e2e-ci/SKILL.md](.cursor/skills/playwright-e2e-ci/SKILL.md)                                                         |
| Worktrees, multiple agents, push to `staging`     | [AGENTS.md § Worktrees and multiple agents](#worktrees-and-multiple-agents)                                                                    |
| Map chrome, Entry zones, flyouts, 320/768 layout  | [.cursor/rules/map-layout.mdc](.cursor/rules/map-layout.mdc) + [docs/map-ui-mode-matrix.md](docs/map-ui-mode-matrix.md)                        |
| Side panel / entity detail views                  | [.cursor/rules/side-panel.mdc](.cursor/rules/side-panel.mdc)                                                                                   |
| Drizzle, API routes, migrations, PGlite           | [.cursor/rules/data-and-migrations.mdc](.cursor/rules/data-and-migrations.mdc)                                                                 |
| Stores and client state                           | [.cursor/rules/svelte-stores.mdc](.cursor/rules/svelte-stores.mdc)                                                                             |
| PR QA evidence and reporting                      | [docs/agentic-qa-process.md](docs/agentic-qa-process.md)                                                                                       |
| **Tests for an issue / test backlog**             | [docs/issue-test-matrix.md](docs/issue-test-matrix.md) + [docs/testing.md](docs/testing.md) + [docs/test-inventory.md](docs/test-inventory.md) |
| Editor manual checklist                           | [docs/editor-foundation-test-plan.md](docs/editor-foundation-test-plan.md)                                                                     |
| When                                              | Read                                                                                                                                           |
| ------------------------------------------------  | -----------------------------------------------------------------------------------------------------------------------                        |
| Issue-linked work / keeping specs current         | [docs/issue-hygiene.md](docs/issue-hygiene.md)                                                                                                 |
| Volunteer triage                                  | [docs/volunteer-triage.md](docs/volunteer-triage.md)                                                                                           |
| Vercel env, deploy guards, Supabase ops           | [AGENTS.md § Vercel CLI and environment ops](#vercel-cli-and-environment-ops)                                                                  |

## How to work

- **Agent efficiency:** Ponytail + agent contract rules in `.cursor/rules/`. Caveman: `bun run install:agent-tooling`. Claude/Codex plugins: `bun run install:agent-plugins`. [docs/agent-tooling.md](docs/agent-tooling.md).
- **Bias toward action.** Do not pad estimates, over-explain tradeoffs, or defer work that is clearly scoped.
- **Default to implementing** when the request is concrete and the codebase path is discoverable. Ask only when a product decision is genuinely ambiguous or irreversible.
- **One pass is often enough.** Prefer a focused implementation plus verification over long planning loops or repeated “want me to…?” prompts.
- **Preserve the dirty tree.** Do not revert unrelated user changes unless explicitly asked.
- **Keep scope tight.** Avoid opportunistic refactors outside the request.
- **Keep GitHub issues current** when work is tied to `#NNN`; issues hold implementation specifics that drift fast. See [docs/issue-hygiene.md](docs/issue-hygiene.md).
- **Infer intent over typos.** User messages are often rushed; read for what they mean, not only literal wording. Common patterns:
- **"PR to main" / "merge to prod"** → release step only: **`staging` → `main`** PR (see [What “ship” means](#what-ship, shipped-means) for the full pipeline).
- **"Ship" / "ship it" / "shipped"** → **two-PR pipeline**: integration PR → `staging`, then release PR → `main`; review and **`bun run build`** at each stage. See [§ What “ship” means](#what-ship, shipped-means).
- **"PR to staging"** → feature branch → `staging` (integration step only).
- **"Push staging" / "ship to staging"** → land on integration only (stage 1); stop before `main` unless the user also asked to ship to prod.
- Minor typos (`pr`, `stagign`, `mrege`, doubled letters); do not ask for clarification when context makes the goal obvious.
- **`data` / `qa` issues:** reporters do not open PRs. Implement on their behalf; credit in issue comments.
- **GitHub + Vercel CLI on maintainer machine:** `gh` and `vercel` are installed, authenticated, and linked (see [§ Vercel CLI and environment ops](#vercel-cli-and-environment-ops)). **Run them yourself by default** for PRs, issues, Actions secrets, env vars, check status, and deploy inspection: do not tell the user to use the dashboard when the CLI can do it. Only stop if auth fails (`gh auth status`, `vercel whoami`), the repo is not linked, or the action is destructive on prod without explicit approval.

### Agent time estimates (not human sprint math)

Estimate like **Composer with repo + shell access**, not like a human developer with meetings and context switches.

- **Do not quote human-day timelines** (“this will take a day”) for scoped repo work. Prefer **“I’ll do it in this session”** or split by **deliverable** (PR1, PR2), not calendar days.
- **Scoped + discoverable path** (one feature, known files, existing patterns) → usually **minutes to one session**, not hours/days of “dev time.” Examples: env wiring, a Playwright smoke slice, a map chrome fix, one API route.
- **Reserve multi-session / multi-PR** for true epics: broad refactors, full test matrices, ship pipeline (`staging` → `main`) with review, or hard external blocks (AMIS token, legal, prod credentials).
- **Say “blocked on you”** when waiting on secrets, passwords, or product decisions: not “implementation takes a day.”
- **Infra cooldowns (rate limits, Supabase circuit breaker):** try once → if blocked, **~5 minutes + one retry** → report and parallelize other work. Do **not** default to “wait 30–60 minutes” unless a second failure proves a longer lockout.

| Bad                                                               | Better                                                                                     |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| “Playwright will take 2–3 days”                                   | “PR1 infra + smoke in this turn; admin specs next PR if needed.”                           |
| “Wait 30–60 min for circuit breaker”                              | “Breaker hit: retry in ~5 min; I’ll continue X meanwhile.”                                 |
| “Want me to implement?” on obvious scope                          | Implement, then report what shipped.                                                       |
| “Optional next steps: …” / “Want me to commit?” after clear scope | **Do the steps.** Only ask when blocked on secrets, product call, or destructive prod ops. |
| “Suggested next session: add Tests AC to issues”                  | Open `gh issue view`, edit the issue body, add the spec file: same turn.                   |
| “CI enforcement can come later”                                   | Add the script/check in the same PR as the policy doc.                                     |
| “Defer store tests: `$state` in Bun”                              | Run store tests in Vitest (`*.store.test.ts`); ship in this session.                       |

### Do not defer executable work

If the path is in the repo and the user did not say “plan only” or “don’t commit”:

1. **Implement**: do not end the turn with a backlog of items you could have done in minutes (issue test matrix + generator + AGENTS policy + regression spec + issue AC edits fit one session).
2. **Same PR**: feature + tests + issue AC checkboxes + doc updates; not “infra PR then tests PR.”
3. **Ask only when blocked**: missing secrets, irreversible product choice, or explicit user stop. Not “should I continue?”
4. **Report what shipped**: not a menu of optional follow-ups. One line “Blocked on X” if truly stuck.

**Underestimating is a process bug.** You have shell, `gh`, `bun test`, Playwright, and the full tree. Scoped issues (#401 regression, issue test matrix, Tests AC on open bugs) are **minutes to one session**, not human-day estimates.

- **Default to one PR** for agent-delivered work. Do not habitually split into “PR1 / PR2 / PR3” or “infra PR then follow-up PR” unless the user asked for split review, the diff is unreviewably huge, or two genuinely independent tracks must land separately. Scoped features (Playwright slice, map fix, env wiring + tests) → **one branch, one PR to `staging`**, implement fully, then ship.

## Branches and pull requests

Default flow: **feature branch → `staging` → `main`**.

| User says (approx.)            | Do this                                             | Do **not** do this                                    |
| ------------------------------ | --------------------------------------------------- | ----------------------------------------------------- |
| Open a PR / PR to staging      | `gh pr create, base staging, head <feature-branch>` | Open feature PRs against `main` for routine work      |
| Ship / ship it / shipped       | Full [two-PR pipeline](#what-ship, shipped-means)   | Merge only to `staging` or only to `main`             |
| PR to main / merge to prod     | Release PR **`staging` → `main`** (stage 2 of ship) | `, base main, head <feature-branch>` for routine work |
| Merge the feature PR           | Squash/merge into **`staging`** first (stage 1)     | Skip `staging` and land features directly on `main`   |
| Ship to staging / push staging | Stage 1 only: integration PR or push to `staging`   | Open release PR to `main` unless user asked for prod  |

- **`main`** is production; semantic-release runs there.
- **`staging`** is integration; feature PRs land here first unless the user explicitly asks for a hotfix straight to `main`.
- When the user says **"PR to main"**, they usually mean **get it to production** (release step), not "set the GitHub PR base branch to `main`" on a feature branch.

### What “ship” / “shipped” means

When the user asks to **ship** a feature or fix, they mean the **full integration → production pipeline**: not a direct push, not release-only, not “merge to staging and stop.”

| Stage              | PR                                                                                  | After merge                                              |
| ------------------ | ----------------------------------------------------------------------------------- | -------------------------------------------------------- |
| **1: Integration** | `<feature-branch>` → **`staging`** (or equivalent PR landing the work on `staging`) | Staging preview deploy (`staging.room-tba.uplbtools.me`) |
| **2: Release**     | **`staging` → `main`**                                                              | Production deploy (`room-tba.uplbtools.me`)              |

**Before each merge (both stages):**

1. **Review**: summarize the PR diff (full branch delta for stage 1; full `staging`…`main` delta for stage 2), not just the latest commit.
2. **Verify build**: run **`bun run build`** locally (requires `DATABASE_URL`); plus lint/tests from [§ Verify before done](#verify-before-done) for the change size.
3. **Wait for green**: confirm the PR’s Vercel preview / GitHub checks pass before merging (stage 1: staging preview build; stage 2: production-bound build on the release PR).

**Agent checklist when user says “ship”:**

1. Open (or complete) integration PR → `staging`; review; local `bun run build`; merge.
2. Open release PR → `main`; review; local `bun run build` again; merge.
3. Report both PR URLs and that prod deploy was triggered from `main`.

Direct commit + push to `staging` without a PR is fine for solo touch-ups ([§ Push to staging directly](#push-to-staging-directly)): but that is **not** “shipped” until stage 2 (`staging` → `main`) is also reviewed, built, and merged.

### Minimize deploys — the Vercel free tier has a daily cap

Every push to `staging` or `main` (and every PR preview) triggers a Vercel deployment, and the free tier caps deployments per day ("Deployment rate limited — retry in 24 hours"). Hitting the cap **freezes all prod deploys for ~24h**.

- **Batch features into one release.** When several fixes/features are ready, land them all on `staging`, then do **one** `staging` → `main` release — not a release per feature. One-PR-per-feature releases burned the cap once already.
- Don't open/refresh PRs just to re-trigger builds; don't push trivial follow-up commits that each redeploy.
- If the cap is hit, further merges only queue undeployed commits — wait for the reset or upgrade the Vercel plan; don't keep merging.

**Merge the release PR with a merge commit, not squash** — semantic-release reads the individual conventional commits to build the changelog; a squash collapses them to one message.

**Release-step (`main`) gotchas — semantic-release.** Pushing to `main` runs `bunx semantic-release` (`.github/workflows/release.yml`). Two failure modes seen in practice:

- **Tag/history divergence → first-release `v1.0.0` collision.** If `main` was ever rewritten so no `vX.Y.Z` tag is reachable from it (`git describe --tags origin/main` says "no tags can describe"), semantic-release assumes a first release, tries `git tag v1.0.0`, and dies (`already exists`). Fix: re-point the highest version tag onto `main`'s current tip as a **lightweight** tag — `git update-ref refs/tags/vX.Y.Z <main-sha>` then `git push origin refs/tags/vX.Y.Z --force`. Use `update-ref`, **not** `git tag -a`: `tag.gpgsign true` forces annotated tags, and semantic-release's ancestor check rejects annotated tags (it compares the tag-object SHA, which isn't a commit). Always **dry-run first**: on a local `staging→main` merge, `GITHUB_REF=refs/heads/main GITHUB_ACTIONS=true bunx semantic-release --dry-run --no-ci` — confirm "next release version is X.Y.Z" (not 1.0.0), and make sure the checked-out `main` ref equals the merge commit or it reads the wrong history.
- **Version-sync PR fails silently.** The auto step that writes the bumped `package.json` + `CHANGELOG.md` back to `main` fails because the org **blocks GitHub Actions from opening PRs** (`continue-on-error`, so the release still "succeeds"). Open it manually: branch off `main`, bump `package.json` version, prepend the GitHub release body to `CHANGELOG.md`, commit `chore(release): X.Y.Z [skip ci]`, merge. Symptom: `CHANGELOG.md` drifts behind the version (froze at 1.23.0 while tags reached 1.36.0); the in-app "What's new"/`/changelog` go stale. To catch up in one shot: pull every release body newer than the CHANGELOG top with `gh release view <tag> --json body`, `sed 's/^## \[/# \[/'` (CHANGELOG uses `#` h1, release bodies use `##`), prepend newest-first, `prettier --write CHANGELOG.md`. The permanent fix is the org toggle **Settings → Actions → General → "Allow GitHub Actions to create and approve pull requests."**

### Databases, migrations, and the E2E secret — gotchas

- **The E2E CI secret must be the POOLER connection string, not the direct one.** `migrations` + `e2e` jobs use `secrets.E2E_DATABASE_URL`. The **direct** form (`postgres@db.<ref>.supabase.co:5432`) fails in CI with `28P01 password authentication failed for user "postgres"` (and the direct host is IPv6-only, unreachable from Actions). Use the **pooler** form: `postgres.<ref>:<pw>@aws-1-<region>.pooler.supabase.com:5432/postgres`. Verify a candidate value locally with `DATABASE_URL="<val>" bun run check:migrations` → expect "OK: N required tables present".
- **Migrations are hand-applied to Supabase, not auto-run.** A new `drizzle/NNNN_*.sql` must be (1) added to `schema.ts` for type inference, (2) applied to the prod DB before/with the deploy, and (3) registered in `scripts/e2e-reset-db.ts` in **both** `E2E_MIGRATION_FILES` and the `TRUNCATE` list. Make routes that hit a new table degrade gracefully (try/catch → empty) so the code can ship before the table exists.
- **The maintainer's local `.env` `DATABASE_URL` IS the prod DB** (verify: it has the real dataset — ~50 buildings, tens of thousands of classes). The Vercel **production** `DATABASE_URL`/`PUBLIC_SUPABASE_URL` are marked Sensitive, so `vercel env pull` returns them **empty** — you can't read prod creds that way; use the local `.env` (which points at the same DB) to apply migrations.

### Verifying UI in-browser: unregister the service worker first

This is a PWA with a service worker that caches assets aggressively. After a rebuild, a browser that visited the origin before serves **stale** JS/CSS. Before trusting an in-browser check, run in the page: unregister all `navigator.serviceWorker` registrations, `caches.delete` every key, then reload. Otherwise you'll debug a build that isn't the one you just made.

### E2E helper gotchas

- **Select entity suggestions by `button.suggestion`, not a loose name regex.** The "Search for classes of `<q>` in rooms" fallback is a bare `<button>` whose text also matches an entity name and sets `category="class"` (no canonical URL). In a cold context it's the only match, so a loose `.first()` grabs it and entity URL-sync silently no-ops.
- **`page.request` does not reliably carry the login cookie** set by `loginViaApi` (in-page fetch). For authenticated API assertions, do the fetch **inside the page** (`page.evaluate(() => fetch(url, {credentials:"same-origin"}))`) so the httpOnly `admin_session` cookie is sent.

### Search chrome: the browse-chip row can't hold many chips

The top-left search chrome's browse-chip row (`campus-browse-chips__container`) overflows/clips past ~5 chips — a 6th chip pushed "Classes" off and clipped it. Put wide or additional controls (e.g. the term selector) on **their own row** rather than inline with the browse chips.

### Class offerings: a lab/recit's parent lecture must be in the same set

`groupClassesByOffering` links a lab/recit (`G-1L`, `UV-1R`) to its lecture by the section prefix before the dash — but only if the **lecture row is in the array passed in**. In the room view the lecture meets in a different room, so `/api/classes?room_code=` never returns it; `RoomClassesStore` must fetch the missing parent lectures (`missingParentLectures` → `fetchClassPage` by course) and merge them, or the lecture won't show.

### Push to `staging` directly

For scoped fixes and solo/maintainer sessions, **committing on `staging` and pushing is fine**: you do not need a feature branch for every change.

```sh
git checkout staging
git pull --rebase origin staging
# … edit, verify, commit …
git push origin staging
```

- Push to **`staging`** when the user asks to land work on integration, ship to staging, or says push (and context is not a release to prod).
- **Do not push to `main`** except via the **`staging` → `main`** release PR (or an explicit hotfix the user requested).
- **Never `vercel deploy, prod`** unless `git branch, show-current` is `main` and matches `origin/main`. Staging integration uses `git push origin staging` only.
- After pushing `staging`, Vercel builds the staging preview (`staging.room-tba.uplbtools.me`). Preview env must have **`DATABASE_URL`** (same Supabase as production) or the build fails at prerender.

Feature branches remain appropriate for large or review-heavy work: `feat/…` → PR to `staging` → merge → delete branch.

## Worktrees and multiple agents

**Default:** one repo checkout, one worktree, on **`staging`**. Run at session start:

```sh
git worktree list
git fetch origin staging main
git status --short --branch
```

### How not to collide with other agents

Multiple Cursor agents (or human + agent) on the **same path and branch** cause lost work, surprise merges, and “it built locally but Vercel failed” confusion.

| Do                                                                      | Don't                                                      |
| ----------------------------------------------------------------------- | ---------------------------------------------------------- |
| **One active agent per worktree path**                                  | Two agents editing `/home/…/room-tba` on `staging` at once |
| `git fetch` + `git status` before editing                               | Assume the tree matches remote                             |
| `git pull, rebase origin staging` before push when others may be active | Force-push `staging` or `main`                             |
| Commit only your scoped changes; preserve unrelated dirty files         | Revert or `git checkout, ` user WIP                        |
| Open a **separate worktree + branch** for parallel long tasks           | Long-lived stashes as a substitute for branches            |
| `git stash drop` / `git stash clear` only when the user asks            | Bulk-drop stashes to “clean up” without checking           |

### Optional: extra worktrees

Use when you need a second branch checked out without disturbing `staging`:

```sh
# new branch in a sibling directory
git worktree add ../room-tba-feat feat/my-thing
cd ../room-tba-feat
# … work, commit, push, open PR to staging …
git worktree remove ../room-tba-feat   # after branch is merged and pushed
```

- Each worktree has its **own** working tree and `.env` (copy or symlink if needed); `node_modules` are per checkout unless shared.
- List/remove: `git worktree list`, `git worktree remove <path>`.
- **Never** edit the same file from two worktrees simultaneously without committing/pushing between pulls.

### Session handoff checklist

Before ending a turn with code changes:

1. `git status`: clean or only intentional WIP left for the user.
2. Commits on the correct branch (`staging` or feature branch).
3. Push only if the user asked (or AGENTS default commit policy applies).
4. If you applied DB migrations, note “run on Supabase before deploy” in the PR or issue.

## GitHub issues

Issues are living specs (paths, schema, acceptance criteria). When coding quickly, update them in the same session as the code:

- **Before starting:** `gh issue view N`; verify cited files/APIs still exist; fix stale body text first.
- **While implementing:** if the approach changes, edit the issue; don't leave wrong paths for the next agent.
- **With the PR:** comment on the issue with the PR link; check off completed AC; set `Last verified against staging: YYYY-MM-DD` and `Status:` at the top.
- **After merge:** close if done, or trim the body and file follow-ups. Move obsolete text under `## Superseded`, don't delete history.

Full checklist: [docs/issue-hygiene.md](docs/issue-hygiene.md).

### Creating issues

Whenever an agent (or maintainer) **files a new GitHub issue**, set triage metadata at creation time: not “later.”

| Required             | Label(s)                                                          | Rule                                                                                                                                                                                  |
| -------------------- | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Size**             | Exactly one of `size/XS` … `size/XL`                              | Estimate effort for one focused PR (see label descriptions on GitHub).                                                                                                                |
| **Priority**         | Exactly one of `priority/high`, `priority/medium`, `priority/low` | `high` = user-visible break or blocker; `medium` = planned improvement; `low` = backlog/nice-to-have.                                                                                 |
| **Good first issue** | `good first issue` **or omit**                                    | Add only when the task is newcomer-safe: clear AC, small surface, no prod DB/auth/security surprises, paths documented. **Do not** tag epics, migrations, or coordination-heavy work. |

**Optional but common:** `bug`, `enhancement`, `design improvement`, `data`, `qa`, `help wanted`: type labels are separate from size/priority.

**Parent / sub-issue structure**

- **Split** when one request spans multiple PRs, tracks, or owners (e.g. contrast audit → review panel + entity forms + map chrome).
- **Parent (epic):** `parent issue` + size `M`/`L`/`XL`; body holds shared context, links children, no duplicated child AC.
- **Child (task):** `sub-issue` + its own size/priority; body starts with `Parent: #NNN` and scoped AC.
- **Do not** close the parent until all linked sub-issues ship or are explicitly deferred.

**`gh` example**

```sh
gh issue create \
  --title "fix(map-chrome): example scoped fix" \
  --label "bug,size/S,priority/medium" \
  --body "$(cat <<'EOF'
Parent: #NNN

## Problem
…

## Acceptance criteria
- [ ] …
EOF
)"
```

For a good-first-issue task, add `good first issue` to `, label`. For epics, omit `good first issue` and use `parent issue,size/M,priority/medium` (adjust size/priority to match).

### Do NOT auto-close issues with human coordination requirements

Some issues cannot be resolved purely through code. Issues that require **external human coordination** must remain open until the human work is complete, even if the technical implementation is merged. Examples include:

- **Partnerships** (e.g., #257): Legal agreements, MOUs, and organizational approvals require human signatures and back-and-forth negotiation.
- **External integrations** requiring third-party API keys, approvals, or contracts.
- **Content moderation policies** needing stakeholder review.
- **Volunteer onboarding** or training workflows dependent on human scheduling.

**Agent protocol for human-dependent issues:**

1. Implement the technical infrastructure (schema, UI stubs, API routes) and reference the issue in the PR.
2. **Do NOT comment "Closes #NNN"** on PRs for human-dependent issues.
3. After merge, **comment on the issue** with what was built and what remains for human coordination.
4. **Keep the issue open** until the user or project lead confirms the human work is complete.
5. If the issue needs splitting, file a follow-up technical issue and rename the original to focus on the human aspect.

When in doubt, ask the user: "Does this issue require external coordination, or can it be closed with the technical implementation?"

## Tests with GitHub issues

**Yes: agents add tests in the same PR as the feature or fix.** Do not ship issue-linked code and file a follow-up “tests PR.”

### Before implementing `#NNN`

1. `gh issue view N` and open [docs/issue-test-matrix.md](docs/issue-test-matrix.md) for the suggested tiers (unit / integration / component / E2E).
2. If the matrix row is wrong, fix the issue body **Acceptance criteria** to name the test layer and file pattern (e.g. `e2e/browse/search-flow.spec.ts`).
3. Regenerate the matrix when triaging many issues: `bun run generate:issue-test-matrix` (needs `gh` auth).

### Same-PR minimum by change type

| Change                     | Add in the same PR                                                              |
| -------------------------- | ------------------------------------------------------------------------------- |
| Bug fix                    | Regression test that would have failed before the fix                           |
| New lib/helper/parser      | `src/**/*.test.ts` or `*.store.test.ts` (Vitest for `$state` stores)            |
| API route / service        | `integration/http/*` or `integration/services/*`                                |
| Map chrome / side panel UI | Vitest `@320px` component test + Playwright browse/admin spec when user-visible |
| Editor / PATCH / 409       | Integration stale-version test + E2E when UI surfaces conflict                  |
| `data` / AMIS import       | Fixture JSON unit test only: **never** live `, fetch` in CI                     |
| Subjective design / whimsy | Component layout guards + manual QA note in PR; do not skip all automation      |

### Issue acceptance criteria template

When editing an issue body, include:

```markdown
## Tests (required in implementation PR)

- [ ] Unit: …
- [ ] Integration: …
- [ ] E2E blocking: …
- [ ] Manual only: …
```

Check these off in the issue when the PR merges.

### What not to automate

Partnerships, legal/MOUs, AMIS live fetch, subjective animation “feel,” prod-only data spot-checks: see [docs/testing.md § Manual only](docs/testing.md#manual-only).

## Verify before done

Adjust checks to change size. PR CI runs **Biome format + unit tests** (no `DATABASE_URL`); full `bun run lint` (includes ESLint) and build remain local/agent responsibilities before merge.

| Step                                                               | When                                                                                                            |
| ------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- |
| `bun run lint` (or targeted biome format / eslint on edited files) | Always before commit/PR                                                                                         |
| `bun test src` (or targeted test files)                            | When logic, lib, or API behavior changed                                                                        |
| `bun run test:components`                                          | When stores or Svelte UI changed                                                                                |
| `bun run test:integration`                                         | When services, admin PATCH, or HTTP routes changed: **local before marking PR ready**; CI runs in gated E2E job |
| Issue-linked work                                                  | Tests per [§ Tests with GitHub issues](#tests-with-github-issues): same PR                                      |
| `bun run build`                                                    | Once before commit/PR on substantive changes (requires `DATABASE_URL`)                                          |
| Manual browser / editor checklist                                  | Map chrome, editor drag/save, side panel UX                                                                     |
| **Agentic browser** (when available)                               | UI flows, console/`pageerror` checks, staging/prod smoke: see below                                             |
| **Dependabot PRs**                                                 | Run Biome format + tests before merge; read CodeQL / dependency-review checks                                   |

Do not run full build after every small edit. See the workflow skill for session cadence.

### Heavy CI gating (integration + E2E)

Integration and Playwright are **not** on every draft push. Policy ([docs/testing.md § Heavy CI gating](docs/testing.md#heavy-ci-gating-prs)):

| When                                        | What runs                                                           |
| ------------------------------------------- | ------------------------------------------------------------------- |
| Every PR push (incl. drafts)                | verify + migrations only (~6–9 min)                                 |
| PR **ready for review** or opened non-draft | integration + blocking E2E (one job), advisory E2E, bundle advisory |
| Label **`run/e2e`**                         | Re-run the gated stack after fixes                                  |
| Push to **`staging`**                       | blocking stack (integration + E2E) via **E2E staging**              |
| **Nightly** 02:00 Asia/Manila               | same on `staging` branch                                            |

Blocking job order: reset DB → `build:e2e` → preview → `test:integration` → Playwright (no duplicate build).

**Agent protocol:**

1. **Draft PRs**: rely on verify + local `bun run test:integration` / `bun run e2e` for API/UI work.
2. **Before merge**: mark ready; wait for **E2E / e2e** green (integration runs inside that job).
3. **After fixes**: `gh pr edit <n>, add-label run/e2e`.
4. **Do not** expect integration or E2E on every commit after ready.

Most Playwright failures are **test harness** issues: fix helpers before changing UI.

**Shared E2E DB pooler — rerun failed E2E solo, never in parallel.** All CI integration/E2E share **one** Supabase E2E project through a session pooler (`pool_size: 15`). Two E2E runs at once (two PRs labelled `run/e2e`, or a PR racing a `staging→main` release run) exhaust it, and the failure surfaces as **misleading** errors — `EMAXCONNSESSION max clients reached`, or logic-level lies like `AccountActionError: Account not found` / `changePassword` failing. Before diagnosing an E2E failure as a real bug: check `gh run list` for another in-progress E2E run; if present, **rerun this one alone** (`gh run rerun <id> --failed`) once the other finishes. Do not trigger `run/e2e` on multiple PRs simultaneously.

**`run/e2e` label is load-bearing.** E2E specs run only when a PR is ready-for-review/non-draft **or** carries `run/e2e`. A PR that changes UI or E2E specs but never gets the label **never runs those specs** — it can merge green and break every downstream branch's E2E (a "tooling" PR once bundled untested UI + new specs this way and broke the suite for days). Label any PR that touches UI or `e2e/`.

**Reproduce a CI E2E failure locally** (to tell a real bug from pooler flake): podman Postgres → `drizzle-kit push` (config without the `loadEnv` import) → `bun run e2e:reset-db` (the URL **must** contain the E2E project ref or `assertE2eDatabase` rejects it) → `bun run build:e2e` → `bun run preview:e2e`; then run the failing spec with `PLAYWRIGHT_REUSE_SERVER=1 PLAYWRIGHT_BASE_URL=http://127.0.0.1:4321`. If it passes locally, it was pooler contention.

### Agentic browser

When the agent session has **browser automation** (Cursor agentic browser, Playwright MCP, or headless Playwright in the shell), **use it** for UI verification instead of skipping straight to “needs manual QA.”

| Use agentic browser for                                                       | Still human-only                     |
| ----------------------------------------------------------------------------- | ------------------------------------ |
| Open entity side panels (building, dorm, room, event)                         | Drag/drop pin polish, animation feel |
| Map chrome at 320px / 768px viewport                                          | Subjective visual design judgment    |
| Capture `pageerror` / console errors after navigation                         | Long editor save/conflict sessions   |
| Dismiss landing modal, wait for bootstrap (`campus-browse-chips`, map canvas) | Production account-specific data     |
| Staging or prod smoke after deploy (`room-tba.uplbtools.me`)                  |                                      |

**Practices:**

- Prefer **local dev** (`bun dev`) for iteration; hit **staging/prod** for release verification.
- Wait for app bootstrap before asserting UI (search chips, map canvas loaded).
- Log console/page errors explicitly; a blank panel with no failed test is not a pass.
- Report what the browser checked vs gaps: same split as [docs/agentic-qa-process.md](docs/agentic-qa-process.md).

If no browser tools are available, say so and list the manual checks still needed.

## Security automation (GitHub)

Production readiness is backed by repo automation; do not disable without replacing:

| Tool                  | Config                                                                               | What it does                                     |
| --------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------ |
| **Dependabot**        | [`.github/dependabot.yml`](.github/dependabot.yml)                                   | Weekly Bun + GitHub Actions version PRs          |
| **CodeQL**            | [`.github/workflows/codeql.yml`](.github/workflows/codeql.yml)                       | Static analysis on push/PR + weekly schedule     |
| **Dependency Review** | [`.github/workflows/dependency-review.yml`](.github/workflows/dependency-review.yml) | Blocks PRs introducing critical CVEs in new deps |
| **CI**                | [`.github/workflows/ci.yml`](.github/workflows/ci.yml)                               | Biome format + unit tests                        |

Enable **Dependabot security updates** and **secret scanning** in GitHub repo Settings → Code security if not already on (org defaults may apply). CodeQL SARIF appears under Security → Code scanning.

## Commits

- **When you finish a scoped task, commit it** unless the user says not to. Do not leave completed work uncommitted across turns.
- **Use [Conventional Commits](https://www.conventionalcommits.org/)**; required for semantic-release on `main`. Format: `type(scope): imperative summary` (e.g. `feat(map-chrome): add transit route panel`, `fix(security): validate image URLs`). Common types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`. Scope is optional but preferred when the change is localized.
- **One logical unit per commit**; atomic, reviewable, GPG-signed: `git commit -S -m "$(cat <<'EOF' … EOF)"`.
- Stage only files that belong together; write a message that states _why_, not a file list.
- Do not push unless asked. **Exception:** user explicitly wants work on integration (`push staging`, `ship to staging`): push `origin staging` after commit. Do not amend or force-push unless the user’s git rules allow it.

## Architecture (short)

- **App:** Astro 7 SSR + Svelte 5 islands, Vercel adapter, Bun.
- **Server data:** Supabase Postgres via Drizzle ([`src/lib/db.ts`](src/lib/db.ts), [`drizzle/schema.ts`](drizzle/schema.ts), migrations in `drizzle/`).
- **Client offline cache:** PGlite in IndexedDB ([`src/lib/local/data/pgliteDB.ts`](src/lib/local/data/pgliteDB.ts)); schema is maintained separately and **can drift** from Drizzle; update both when changing tables.
- **Client state:** [`src/lib/store.svelte.ts`](src/lib/store.svelte.ts) (monolithic store module; import via `@lib/store.svelte`).
- **Auth:** HMAC cookie `admin_session` + bcrypt `admin_users` gates `/api/admin/*`. Supabase Auth ([`src/lib/supabase/*`](src/lib/supabase/)) is additive in middleware; intended long-term consolidation target.
- **Do not edit:** `drizzle-migrations/` (archived SQLite history). Do not add browser `/admin` pages as the editor surface.

## Product direction

- Prefer editing in the main app over building a separate admin dashboard.
- The editor login should use the in-app popup. `/admin` browser pages should redirect into the main app login flow.
- Keep the read and edit experiences colocated: if a user can view an entity in the app, an editor should eventually edit it there.
- Editor capabilities (map pin editing, proposals, optimistic concurrency, version history, undo/redo) live in the main map app; extend in place.

## Editor UX rules

- No decorative or attention-seeking animations. Do not add pulsing/“live” dots, blinking badges, glowing rings, bouncing elements, or similar gimmicks. Keep the UI calm and static; only animate when it communicates real state (e.g. a spinner during a save).
- Layout must never overflow or overlap. Buttons and chips must stay inside their container, controls must wrap gracefully on narrow widths, and text must truncate (ellipsis) instead of colliding with neighbors. Verify the header/action rows at narrow widths before finishing.
- Keep editor controls compact and map-friendly. Avoid large modals for persistent edit state.
- Do not show duplicate feedback surfaces. If the editor toolbar already explains the state, do not also show an info toast.
- Failed saves must not leave the UI implying success. Roll markers back to the previous local position, or to the latest server position on conflict.
- Error messages should name the exact entity that failed without repeating generic wording.
- Support common shortcuts in map edit mode: `Ctrl+Z` / `Cmd+Z` for undo, `Ctrl+Y` / `Cmd+Y` and `Shift+Ctrl+Z` / `Shift+Cmd+Z` for redo.

## UI guardrails

Map and side-panel layout rules are detailed in glob-scoped Cursor rules; read them before editing matched files.

- **Map chrome:** Entry zones only; one Map tools flyout; verify 320px + 768px. See [map-layout.mdc](.cursor/rules/map-layout.mdc) and [map-ui-mode-matrix.md](docs/map-ui-mode-matrix.md).
- **Side panel:** Header → body → directions → footer; parity across Room/Building/Dorm results. See [side-panel.mdc](.cursor/rules/side-panel.mdc).

## Data integrity

- Use optimistic concurrency for editor writes. Send the version the client last saw, and return `409 Conflict` with the latest row if it is stale.
- Missing client versions are a transitional compatibility fallback only; new editor surfaces should send versions.
- Current entity tables store the latest state. `editor_history` stores the audit timeline.
- Reverts should create new history entries instead of rewriting or deleting old history.
- Every admin write should refresh the relevant sync key so clients can detect changed data.

## AMIS class imports

### CRS term IDs (source of truth)

CRS/AMIS `term_id` values are **chronological within the academic year**: the number is not a semantic label:

| CRS id   | Period       | Typical dates (AY 2025–2026) |
| -------- | ------------ | ---------------------------- |
| **1251** | 1st semester | Aug–Dec                      |
| **1252** | 2nd semester | Jan–May                      |
| **1253** | Midyear      | Jun–Jul                      |

- **`terms.id` must equal the CRS id** you pass to `, term-id` / AMIS fetch. Fix labels and calendar dates in the `terms` row; **never move class rows between ids** to “fix” a naming mix-up.
- Import commands: 2nd sem `, term-id 1252, fetch`; midyear `, term-id 1253, fetch`.
- **Do not re-apply** [`drizzle/0012_reassign_second_sem_classes.sql`](drizzle/0012_reassign_second_sem_classes.sql): it assumed 1252 was mislabeled 2nd sem data. That was wrong. Term metadata is corrected in [`0013_fix_crs_term_labels.sql`](drizzle/0013_fix_crs_term_labels.sql). Migrations `0009`/`0010` had the same backwards assumption; do not copy their label/date mapping into new code.

### Pitfalls (read before triaging “wrong term” bugs)

1. **Do not infer term type from row count.** A term with 3k+ rows is not automatically “2nd sem”; a term with ~200 rows is not automatically “broken.” Check **schedule patterns** in `classes.schedule`:

- **Midyear (1253):** intensive daily blocks: `MTWTHFS`, `MTWTHF`, `TTHS`, Saturday-heavy slots.
- **2nd sem (1252):** regular semester: mostly `TTH`, `MWF`, single-day weekly slots.

2. **Do not conflate CRS id with English name.** Early agents assumed “1252 sounds like midyear slot”: wrong. Always trust the chronological table above and what AMIS returns for that numeric id.
3. **Thousands fetched, hundreds imported is normal.** AMIS returns every section type; Room TBA imports only **LEC/LAB with a matched room** (see below). A 12k fetch → ~3k import for 2nd sem is expected; a 6k fetch → ~120 for midyear can be expected too.
4. **Two different “skipped row” buckets**: do not treat them as the same bug:

- **By design:** THE (thesis), SPR (special problem), PRA (practicum), DSR (dissertation), IND, etc. usually have **no `facility_id`** in AMIS. Skipped on purpose; users are told on the room panel. See `src/lib/amis/room-scheduled-types.ts`.
- **Data gap (#300):** LEC/LAB rows **with** a facility string that does not match `rooms.room_code` (aliases, typos, `PSLH-A` vs `PSLH A`). Needs alias work, not term-id surgery.

5. **Validate before “re-import to fix term”.** Query sample schedules per `term_id`, confirm `/api/terms` labels match CRS table, then re-import the **correct CRS id** with `, replace`. Do not run 0012-style mass `UPDATE term_id`.

### Workflow

- **Fetch once, reuse cache:** `bun run import:amis-classes,, term-id <id>, fetch` saves sanitized rows to `data/amis-*-<id>.json` (gitignored). Re-import with the same command **without** `, fetch`: no AMIS hammering.
- **Short-lived tokens:** `AMIS_BEARER_TOKEN` from a logged-in AMIS session expires in about an hour. Copy a fresh token right before `, fetch`; do not rely on a token saved in `.env` from yesterday. Cached JSON imports do not need a token. Never commit tokens or paste them into issues or chat logs.
- **Never store or commit instructor names.** AMIS responses embed faculty/user PII. `sanitizeAmisRow()` strips it before any JSON is written. Do not commit `data/amis-*.json`, raw AMIS dumps, or DB exports that include `faculty`, `first_name`, `formatted_name`, etc.
- The app DB stores only course code, section, type, title, schedule slots, room, and term: never instructor fields.
- If unsanitized exports exist locally, run `bun run import:amis-classes,, scrub-exports`.

## Database and APIs

- Supabase Postgres is the runtime source of truth via `DATABASE_URL` (not `NEON_CONNECTION_STRING`). Code, Drizzle, seeds, and the Astro env schema all use `DATABASE_URL`. On Vercel, name the env var `DATABASE_URL`.
- Supabase JS (`@supabase/supabase-js` + `@supabase/ssr`) is additive: `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_PUBLISHABLE_KEY` power Auth/client features via `src/lib/supabase/*`. Keep using Drizzle + `DATABASE_URL` for existing Postgres queries unless a feature explicitly needs the JS client.
- Drizzle schema changes need a matching SQL migration in `drizzle/`. Apply pending migrations to Supabase before deploying code that depends on them; skipped migrations cause runtime query failures (e.g. missing `0007_add_event_image_url.sql` leaves out `events.image_url` and breaks event loading).
- **PGlite drift:** offline tables in `pgliteDB.ts` must stay aligned with server schema and with [`src/lib/local/data/sync.ts`](src/lib/local/data/sync.ts) consumers.
- Admin API routes live under `/api/admin/*` and must keep auth checks.
- Keep PATCH routes field-level and partial so unrelated edits do not clobber each other.

## Vercel CLI and environment ops

The project deploys on Vercel (`stimmie/saan-ang-room`, see `.vercel/project.json`). Production: `room-tba.uplbtools.me`. Staging preview: `staging.room-tba.uplbtools.me`. Git remote may redirect `smmariquit/room-tba` → **`uplbtools/room-tba`**: use `gh` against **`uplbtools/room-tba`** (`gh pr create`, `gh secret set`, `gh issue view`, etc.).

### CLI default for agents

Maintainer sessions have **GitHub CLI** and **Vercel CLI** ready. Prefer the CLI over “go to Settings in the browser” unless the CLI errors or the value is not available locally (e.g. encrypted `vercel env pull` omitting `DATABASE_URL`).

| Task                    | Run (agent)                                                     | Do not default to                                     |
| ----------------------- | --------------------------------------------------------------- | ----------------------------------------------------- |
| Open/update PR          | `gh pr create`, `gh pr view`, `gh pr checks`                    | Asking user to open GitHub UI                         |
| Issues                  | `gh issue view/create/edit`, `gh issue comment`                 | Manual issue paste-only                               |
| GitHub Actions secrets  | `gh secret set`, `gh secret list, repo uplbtools/room-tba`      | “Add this in repo Settings”                           |
| Vercel env vars         | `vercel env ls`, `vercel env add … preview staging, yes, force` | Vercel UI only                                        |
| Refresh local env hints | `vercel env pull.env.vercel, environment=preview, yes`          | Assuming empty pull means unset                       |
| Inspect deploys         | `vercel ls`, `vercel inspect <url>`                             | :                                                     |
| Prod deploy             | **`staging → main` merge only**                                 | `vercel deploy, prod` except hotfix + `main` checkout |

**Secrets:** read values from local gitignored `.env` (or generate e.g. `openssl rand -hex 32`); pass via `, body` / `, value`. Never commit secrets or paste them into issues, PRs, or chat.

**Verify once per session if unsure:** `gh auth status`, `vercel whoami`, `test -f.vercel/project.json`.

### Branch → deploy target

| Git branch       | Vercel target    | URL (approx.)                   |
| ---------------- | ---------------- | ------------------------------- |
| `main`           | **Production**   | `room-tba.uplbtools.me`         |
| `staging`        | **Preview** only | `staging.room-tba.uplbtools.me` |
| feature branches | **Preview**      | `*.vercel.app`                  |

Code reaches production **only** when `staging → main` is merged (release PR), then Vercel builds **`main`**. Confirm Vercel → Project → Settings → Git has **Production Branch = `main`**.

Build guards (run automatically on Vercel via `scripts/vercel-build-guard.sh` before `astro build`):

- `scripts/check-vercel-env.sh`: fails if `DATABASE_URL` is missing or an empty string.
- `scripts/check-production-branch.sh`: fails production builds when `VERCEL_GIT_COMMIT_REF` is not `main`.

Local checks: `bun run check:vercel-env`, `bun run check:prod-branch` (set `VERCEL_ENV=production` to test the branch guard).

### Env vars required for builds

- **`DATABASE_URL` is mandatory** for `bun run build` (Astro SSG prerender hits Postgres). Required on **Production** and **Preview (all branches)**: not only `staging`.
- Legacy **`NEON_CONNECTION_STRING`** may still appear in Vercel; **runtime code uses `DATABASE_URL` only**.
- Optional server vars: `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, `R2_*`. Supabase JS client uses separate `PUBLIC_SUPABASE_URL` + `PUBLIC_SUPABASE_PUBLISHABLE_KEY` (optional until Auth features need them). See `.env.example`.

### Commands (cheat sheet)

```sh
vercel link
vercel env ls
vercel env pull .env.vercel --environment=production --yes   # or preview / development
vercel env add DATABASE_URL production --value "$DATABASE_URL" --yes --force
vercel env add DATABASE_URL preview staging --value "$DATABASE_URL" --yes --force
vercel env add PUBLIC_SUPABASE_URL preview staging --value "$PUBLIC_SUPABASE_URL" --yes --force
vercel ls
vercel inspect <deployment-url>
vercel deploy --prod --yes   # manual prod redeploy — only from main checkout

gh secret set E2E_DATABASE_URL --repo uplbtools/room-tba --body "$E2E_DATABASE_URL"
gh secret list --repo uplbtools/room-tba
gh pr checks <number> --repo uplbtools/room-tba
```

### Pitfalls

| Trap                                                              | Reality                                                                                                               |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `vercel env pull` shows `DATABASE_URL=""`                         | Encrypted values often **omit** in pull output: not proof the var is unset. Verify via successful build or Vercel UI. |
| Var listed as “Encrypted” in `vercel env ls`                      | Can still be an **empty string**: causes `[EnvInvalidVariables] DATABASE_URL is missing`.                             |
| `vercel env add DATABASE_URL preview` (no branch) non-interactive | CLI returns `git_branch_required`; use branch arg (`staging`) or Vercel API for all Preview targets.                  |
| Only `Preview (staging)` has `DATABASE_URL`                       | PR previews on other branches still fail.                                                                             |
| `vercel deploy, prod` from `staging` checkout                     | Bypasses release gate: blocked by `check-production-branch.sh` on Vercel production builds.                           |

**API fallback (all Preview branches, non-interactive):** `POST /v10/projects/{projectId}/env?teamId={teamId}` with `{ "key": "DATABASE_URL", "value": "…", "type": "encrypted", "target": ["preview"] }`. Never paste connection strings into issues or commits.

**More env traps:**

| Trap                                                 | Reality                                                                                                                                                                                                                                                                    |
| ---------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Map renders flat (no 3D building extrusions) locally | `PUBLIC_MAPTILER_KEY` unset → `loadCampusMapStyle` returns the raster fallback (`E2E_FALLBACK_MAP_STYLE`). **Not a regression** — prod has the key; local `.env` usually doesn't. Verify prod on `room-tba.uplbtools.me` (loads `api.maptiler.com/tiles/v3-openmaptiles`). |
| Fork PR `verify` fails: `DATABASE_URL is missing`    | Fork PRs **can't read Actions secrets** — the build's prerender has no DB. For trivial fork docs, `gh pr merge --admin` (staging is unprotected). Real fork code needs a maintainer-run build.                                                                             |
| Dependabot PR CI fails the same way                  | Dependabot uses the **Dependabot** secret store, not Actions — mirror the secret there, or the CI workflow skips secret-dependent jobs for `github.actor == 'dependabot[bot]'`.                                                                                            |

### Supabase ops

- **Runtime Postgres:** Supabase via **`DATABASE_URL`** (Drizzle in `src/lib/db.ts`). Not PGlite, not Neon at runtime.
- **Migrations:** SQL in `drizzle/`: apply to Supabase **before** deploying code that depends on new columns (`psql "$DATABASE_URL" -f drizzle/….sql` or dashboard SQL editor). Repo does not use `supabase db push` as the primary flow.
- **Connection string / serverless pooling.** The **session pooler** (`*.pooler.supabase.com:5432`) caps at `pool_size` (15). `src/lib/db.ts` opens `DATABASE_POOL_MAX` (default **10**) connections _per serverless instance_, so a Vercel cold-start burst (every route after a deploy, or concurrent traffic) exhausts the pooler → intermittent **500/503 that self-recover once warm** (`EMAXCONNSESSION`, or `Failed query … NodePgPreparedQuery`). Reported as "the serverless function crashed" but static pages + warm/cached routes stay fine. **Quick mitigation:** `vercel env add DATABASE_POOL_MAX production` = `2` (and `preview`), then redeploy. **Durable fix:** point `DATABASE_URL` at the Supabase **transaction pooler** (port **6543**) and set `prepare: false` in `db.ts` — it's built for many short serverless connections. A fresh deploy always triggers a brief cold-start burst; diagnose with `vercel logs <deployment-url>` and confirm via a _sequential_ probe (real users are fine) vs a concurrent one.
- **Optional CLI:** `supabase login`, `supabase projects list`; `bunx drizzle-kit studio` to browse schema locally (needs working `DATABASE_URL`).
- After fixing Vercel env, **redeploy**: failed deployments are not auto-retried.

Human setup detail: [docs/developer-guide.md](docs/developer-guide.md). Cursor Cloud quick notes remain in [§ Cursor Cloud specific instructions](#cursor-cloud-specific-instructions) below: link here instead of duplicating env troubleshooting.

## README sync (no drift)

`README.md` is the human onboarding contract: not decoration. **Never merge stack, env, workflow, or contributor-facing behavior changes without updating README in the same PR.** Do not file a follow-up “docs PR” unless the user explicitly asked to split.

### Update README when you change…

| If you touch…                                | README must reflect…                                       |
| -------------------------------------------- | ---------------------------------------------------------- |
| `package.json` scripts                       | Command names, what they do, when they need `DATABASE_URL` |
| `astro.config.mjs` / `.env.example` env vars | Required vs optional vars, where to get values             |
| Database provider, Drizzle, migrations       | Supabase Postgres + `drizzle/`: not SQLite/Neon as runtime |
| Astro / Bun / major deps                     | Version labels that match `package.json`                   |
| CI workflows (`.github/workflows/*`)         | What runs on PRs (`bun test src`, Biome format, etc.)      |
| Live URL, repo org, default term label       | Links, “current semester” data note, changelog path        |
| Editor login entry points                    | `/?editor=login`, in-app editing: not a separate admin app |
| Project layout (`src/pages`, `src/lib`, …)   | Folder tree in README matches reality                      |
| New user-visible features                    | Feature table or student-mode bullets                      |

**Pair with `.env.example`:** new server env vars get a commented line in `.env.example` and a README mention in the same change set.

### Before commit or PR

1. Re-read the README sections your change affects: dev setup, stack, contributing, data note.
2. Run **`bun run check:readme`**: fails on known stale phrases (Neon, `info.db` as runtime DB, `/src/routes`, `npm install`, wrong Astro major, “no automated test suite”).
3. If you changed env or scripts and README still looks fine, you probably missed an update: check again.

README-only overhauls are welcome; they still must pass `check:readme` and stay accurate against `package.json`, `.env.example`, and `AGENTS.md`.

## Verification

- After substantive changes: lint, relevant unit tests, and `bun run build` (local).
- For editor changes: [docs/editor-foundation-test-plan.md](docs/editor-foundation-test-plan.md).
- For PR QA: [docs/agentic-qa-process.md](docs/agentic-qa-process.md); separate automated evidence from browser-only checks.
- **Use agentic browser when available** for UI regressions (see [§ Agentic browser](#agentic-browser)); do not defer to humans what automation can prove.
- Avoid mutating production-like server data unless intentional and reversible. Restore accidental test mutations immediately.

## Cursor Cloud specific instructions

- Package manager is **Bun** (installed at `~/.bun/bin`). The startup update script runs `bun install, frozen-lockfile`. Use Bun, not npm, even though a npm lockfile may also be present.
- **A reachable Postgres is required; no local DB fallback.** Runtime DB is **Supabase** (`*.supabase.co`); `src/lib/db.ts` connects via `DATABASE_URL` (see `astro:env/server` in `astro.config.mjs`). Local `.env` must point at Supabase, not a stale Neon URL. `ADMIN_PASSWORD` is needed for admin/editor features. Apply migrations in `drizzle/` before first run.
- **Refreshing local `.env`:** Production/preview `DATABASE_URL` lives in Vercel env vars. When `.env` is empty or stale: `vercel env pull.env.vercel, environment=development, yes` (requires Vercel CLI linked to `stimmie/saan-ang-room`; room-tba.stimmie.dev; not a separate empty `room-tba` project; see `.vercel/project.json`), merge `DATABASE_URL` into `.env`, keep local `ADMIN_PASSWORD` if already set. `vercel env pull` often returns empty `""` for encrypted vars like `DATABASE_URL`; copy from Vercel UI (Settings → Environment Variables) or Supabase dashboard instead. Use the Supabase **session pooler** URL (`*.pooler.supabase.com`) for local dev. Or provide `DATABASE_URL` via Cursor Secrets.
- **`bun dev` without `DATABASE_URL`:** Server starts but SSR returns HTTP 500 (`EnvInvalidVariables: DATABASE_URL is missing`). Set a valid Supabase connection string in `.env` and restart.
- **Optional R2:** Image upload (`/api/admin/upload`) needs `R2_*` vars (see `.env.example`, `wrangler.jsonc`). App runs without them; upload UI shows a not-configured message.
- This is **Astro 7 SSR** (Vercel adapter). API routes under `src/pages/api/*` are server-rendered (`prerender = false`), and SSG entity pages (e.g. `/room/[slug]`) query the DB at build time; so `bun run build` fails without a working `DATABASE_URL`.
- `@electric-sql/pglite` (`idb://site-data`) is a **browser-side cache only**, not a server/dev database fallback.
- **PWA:** Workbox precaches `dist/client`; large client bundles affect offline install. See `astro.config.mjs` PWA config before adding heavy dependencies.
- Standard scripts: `bun dev` (`http://localhost:4321/`), `bun run build`, `bun preview`, `bun run lint`, `bun run format`, `bun test src`, `bun run check:readme`. PR CI runs Biome format check + unit tests; run full lint and build locally before merge.
