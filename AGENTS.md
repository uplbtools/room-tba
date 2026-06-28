# Room TBA Agent Guide

**Human developers and campus volunteers:** start with [CONTRIBUTING.md](CONTRIBUTING.md). You do not need this file.

## Doc map

Read the right doc for the task; do not rely on this file alone for detailed checklists.

| When                                             | Read                                                                                                                    |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| Human volunteers, developers (default)           | [CONTRIBUTING.md](CONTRIBUTING.md)                                                                                      |
| Developer setup detail                           | [docs/developer-guide.md](docs/developer-guide.md)                                                                      |
| Starting a coding session, commit, or PR         | [.cursor/skills/room-tba-agent-workflow/SKILL.md](.cursor/skills/room-tba-agent-workflow/SKILL.md)                      |
| Worktrees, multiple agents, push to `staging`      | [AGENTS.md § Worktrees and multiple agents](#worktrees-and-multiple-agents)                                             |
| Map chrome, Entry zones, flyouts, 320/768 layout | [.cursor/rules/map-layout.mdc](.cursor/rules/map-layout.mdc) + [docs/map-ui-mode-matrix.md](docs/map-ui-mode-matrix.md) |
| Side panel / entity detail views                 | [.cursor/rules/side-panel.mdc](.cursor/rules/side-panel.mdc)                                                            |
| Drizzle, API routes, migrations, PGlite          | [.cursor/rules/data-and-migrations.mdc](.cursor/rules/data-and-migrations.mdc)                                          |
| Stores and client state                          | [.cursor/rules/svelte-stores.mdc](.cursor/rules/svelte-stores.mdc)                                                      |
| PR QA evidence and reporting                     | [docs/agentic-qa-process.md](docs/agentic-qa-process.md)                                                                |
| Editor manual checklist                          | [docs/editor-foundation-test-plan.md](docs/editor-foundation-test-plan.md)                                              |
| When                                             | Read                                                                                                                    |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| Issue-linked work / keeping specs current        | [docs/issue-hygiene.md](docs/issue-hygiene.md)                                                                          |
| Volunteer triage                                 | [docs/volunteer-triage.md](docs/volunteer-triage.md)                                                                    |

## How to work

- **Bias toward action.** Do not pad estimates, over-explain tradeoffs, or defer work that is clearly scoped.
- **Default to implementing** when the request is concrete and the codebase path is discoverable. Ask only when a product decision is genuinely ambiguous or irreversible.
- **One pass is often enough.** Prefer a focused implementation plus verification over long planning loops or repeated “want me to…?” prompts.
- **Preserve the dirty tree.** Do not revert unrelated user changes unless explicitly asked.
- **Keep scope tight.** Avoid opportunistic refactors outside the request.
- **Keep GitHub issues current** when work is tied to `#NNN`; issues hold implementation specifics that drift fast. See [docs/issue-hygiene.md](docs/issue-hygiene.md).
- **Infer intent over typos.** User messages are often rushed; read for what they mean, not only literal wording. Common patterns:
  - **"PR to main" / "merge to prod" / "ship it"** → promote **`staging` → `main`** (release PR), not a feature branch opened against `main`. See [Branches and pull requests](#branches-and-pull-requests).
  - **"PR to staging"** → feature branch → `staging` (default for new work).
  - **"Push staging" / "ship to staging"** → commit on `staging` and `git push origin staging` ([§ Push to staging directly](#push-to-staging-directly)).
  - Minor typos (`pr`, `stagign`, `mrege`, doubled letters); do not ask for clarification when context makes the goal obvious.
- **`data` / `qa` issues:** reporters do not open PRs. Implement on their behalf; credit in issue comments.

## Branches and pull requests

Default flow: **feature branch → `staging` → `main`**.

| User says (approx.)               | Do this                                                | Do **not** do this                                     |
| --------------------------------- | ------------------------------------------------------ | ------------------------------------------------------ |
| Open a PR / PR to staging         | `gh pr create --base staging --head <feature-branch>`  | ;                                                      |
| PR to main / merge to prod / ship | Open (or merge) **`staging` → `main`** release PR only | `--base main --head <feature-branch>` for routine work |
| Merge the feature PR              | Squash/merge into **`staging`** first                  | Skip `staging` and land features directly on `main`    |

- **`main`** is production; semantic-release runs there.
- **`staging`** is integration; feature PRs land here first unless the user explicitly asks for a hotfix straight to `main`.
- When the user says **"PR to main"**, they usually mean **get it to production**, not "set the GitHub PR base branch to `main`."

### Push to `staging` directly

For scoped fixes and solo/maintainer sessions, **committing on `staging` and pushing is fine** — you do not need a feature branch for every change.

```sh
git checkout staging
git pull --rebase origin staging
# … edit, verify, commit …
git push origin staging
```

- Push to **`staging`** when the user asks to land work on integration, ship to staging, or says push (and context is not a release to prod).
- **Do not push to `main`** except via the **`staging` → `main`** release PR (or an explicit hotfix the user requested).
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

| Do | Don't |
| --- | --- |
| **One active agent per worktree path** | Two agents editing `/home/…/room-tba` on `staging` at once |
| `git fetch` + `git status` before editing | Assume the tree matches remote |
| `git pull --rebase origin staging` before push when others may be active | Force-push `staging` or `main` |
| Commit only your scoped changes; preserve unrelated dirty files | Revert or `git checkout --` user WIP |
| Open a **separate worktree + branch** for parallel long tasks | Long-lived stashes as a substitute for branches |
| `git stash drop` / `git stash clear` only when the user asks | Bulk-drop stashes to “clean up” without checking |

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

1. `git status` — clean or only intentional WIP left for the user.
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

## Verify before done

Adjust checks to change size. PR CI runs **Prettier + unit tests** (no `DATABASE_URL`); full `bun run lint` (includes ESLint) and build remain local/agent responsibilities before merge.

| Step                                                         | When                                                                      |
| ------------------------------------------------------------ | ------------------------------------------------------------------------- |
| `bun run lint` (or targeted prettier/eslint on edited files) | Always before commit/PR                                                   |
| `bun test src` (or targeted test files)                      | When logic, lib, or API behavior changed                                  |
| `bun run build`                                              | Once before commit/PR on substantive changes (requires `DATABASE_URL`)    |
| Manual browser / editor checklist                            | Map chrome, editor drag/save, side panel UX                               |
| **Dependabot PRs**                                           | Run Prettier + tests before merge; read CodeQL / dependency-review checks |

Do not run full build after every small edit. See the workflow skill for session cadence.

## Security automation (GitHub)

Production readiness is backed by repo automation; do not disable without replacing:

| Tool                  | Config                                                                               | What it does                                     |
| --------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------ |
| **Dependabot**        | [`.github/dependabot.yml`](.github/dependabot.yml)                                   | Weekly Bun + GitHub Actions version PRs          |
| **CodeQL**            | [`.github/workflows/codeql.yml`](.github/workflows/codeql.yml)                       | Static analysis on push/PR + weekly schedule     |
| **Dependency Review** | [`.github/workflows/dependency-review.yml`](.github/workflows/dependency-review.yml) | Blocks PRs introducing critical CVEs in new deps |
| **CI**                | [`.github/workflows/ci.yml`](.github/workflows/ci.yml)                               | Prettier + unit tests                            |

Enable **Dependabot security updates** and **secret scanning** in GitHub repo Settings → Code security if not already on (org defaults may apply). CodeQL SARIF appears under Security → Code scanning.

## Commits

- **When you finish a scoped task, commit it** unless the user says not to. Do not leave completed work uncommitted across turns.
- **Use [Conventional Commits](https://www.conventionalcommits.org/)**; required for semantic-release on `main`. Format: `type(scope): imperative summary` (e.g. `feat(map-chrome): add transit route panel`, `fix(security): validate image URLs`). Common types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`. Scope is optional but preferred when the change is localized.
- **One logical unit per commit**; atomic, reviewable, GPG-signed: `git commit -S -m "$(cat <<'EOF' … EOF)"`.
- Stage only files that belong together; write a message that states _why_, not a file list.
- Do not push unless asked. **Exception:** user explicitly wants work on integration (`push staging`, `ship to staging`) — push `origin staging` after commit. Do not amend or force-push unless the user’s git rules allow it.

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

CRS/AMIS `term_id` values are **chronological within the academic year** — the number is not a semantic label:

| CRS id   | Period       | Typical dates (AY 2025–2026) |
| -------- | ------------ | ---------------------------- |
| **1251** | 1st semester | Aug–Dec                      |
| **1252** | 2nd semester | Jan–May                      |
| **1253** | Midyear      | Jun–Jul                      |

- **`terms.id` must equal the CRS id** you pass to `--term-id` / AMIS fetch. Fix labels and calendar dates in the `terms` row; **never move class rows between ids** to “fix” a naming mix-up.
- Import commands: 2nd sem `--term-id 1252 --fetch`; midyear `--term-id 1253 --fetch`.
- **Do not re-apply** [`drizzle/0012_reassign_second_sem_classes.sql`](drizzle/0012_reassign_second_sem_classes.sql) — it assumed 1252 was mislabeled 2nd sem data. That was wrong. Term metadata is corrected in [`0013_fix_crs_term_labels.sql`](drizzle/0013_fix_crs_term_labels.sql). Migrations `0009`/`0010` had the same backwards assumption; do not copy their label/date mapping into new code.

### Pitfalls (read before triaging “wrong term” bugs)

1. **Do not infer term type from row count.** A term with 3k+ rows is not automatically “2nd sem”; a term with ~200 rows is not automatically “broken.” Check **schedule patterns** in `classes.schedule`:
   - **Midyear (1253):** intensive daily blocks — `MTWTHFS`, `MTWTHF`, `TTHS`, Saturday-heavy slots.
   - **2nd sem (1252):** regular semester — mostly `TTH`, `MWF`, single-day weekly slots.
2. **Do not conflate CRS id with English name.** Early agents assumed “1252 sounds like midyear slot” — wrong. Always trust the chronological table above and what AMIS returns for that numeric id.
3. **Thousands fetched, hundreds imported is normal.** AMIS returns every section type; Room TBA imports only **LEC/LAB with a matched room** (see below). A 12k fetch → ~3k import for 2nd sem is expected; a 6k fetch → ~120 for midyear can be expected too.
4. **Two different “skipped row” buckets** — do not treat them as the same bug:
   - **By design:** THE (thesis), SPR (special problem), PRA (practicum), DSR (dissertation), IND, etc. usually have **no `facility_id`** in AMIS. Skipped on purpose; users are told on the room panel. See `src/lib/amis/room-scheduled-types.ts`.
   - **Data gap (#300):** LEC/LAB rows **with** a facility string that does not match `rooms.room_code` (aliases, typos, `PSLH-A` vs `PSLH A`). Needs alias work, not term-id surgery.
5. **Validate before “re-import to fix term”.** Query sample schedules per `term_id`, confirm `/api/terms` labels match CRS table, then re-import the **correct CRS id** with `--replace`. Do not run 0012-style mass `UPDATE term_id`.

### Workflow

- **Fetch once, reuse cache:** `bun run import:amis-classes -- --term-id <id> --fetch` saves sanitized rows to `data/amis-*-<id>.json` (gitignored). Re-import with the same command **without** `--fetch` — no AMIS hammering.
- **Short-lived tokens:** `AMIS_BEARER_TOKEN` from a logged-in AMIS session expires in about an hour. Copy a fresh token right before `--fetch`; do not rely on a token saved in `.env` from yesterday. Cached JSON imports do not need a token. Never commit tokens or paste them into issues or chat logs.
- **Never store or commit instructor names.** AMIS responses embed faculty/user PII. `sanitizeAmisRow()` strips it before any JSON is written. Do not commit `data/amis-*.json`, raw AMIS dumps, or DB exports that include `faculty`, `first_name`, `formatted_name`, etc.
- The app DB stores only course code, section, type, title, schedule slots, room, and term — never instructor fields.
- If unsanitized exports exist locally, run `bun run import:amis-classes -- --scrub-exports`.

## Database and APIs

- Supabase Postgres is the runtime source of truth via `DATABASE_URL` (not `NEON_CONNECTION_STRING`). Code, Drizzle, seeds, and the Astro env schema all use `DATABASE_URL`. On Vercel, name the env var `DATABASE_URL`.
- Supabase JS (`@supabase/supabase-js` + `@supabase/ssr`) is additive: `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_PUBLISHABLE_KEY` power Auth/client features via `src/lib/supabase/*`. Keep using Drizzle + `DATABASE_URL` for existing Postgres queries unless a feature explicitly needs the JS client.
- Drizzle schema changes need a matching SQL migration in `drizzle/`. Apply pending migrations to Supabase before deploying code that depends on them; skipped migrations cause runtime query failures (e.g. missing `0007_add_event_image_url.sql` leaves out `events.image_url` and breaks event loading).
- **PGlite drift:** offline tables in `pgliteDB.ts` must stay aligned with server schema and with [`src/lib/local/data/sync.ts`](src/lib/local/data/sync.ts) consumers.
- Admin API routes live under `/api/admin/*` and must keep auth checks.
- Keep PATCH routes field-level and partial so unrelated edits do not clobber each other.

## README sync (no drift)

`README.md` is the human onboarding contract — not decoration. **Never merge stack, env, workflow, or contributor-facing behavior changes without updating README in the same PR.** Do not file a follow-up “docs PR” unless the user explicitly asked to split.

### Update README when you change…

| If you touch…                                | README must reflect…                                        |
| -------------------------------------------- | ----------------------------------------------------------- |
| `package.json` scripts                       | Command names, what they do, when they need `DATABASE_URL`  |
| `astro.config.mjs` / `.env.example` env vars | Required vs optional vars, where to get values              |
| Database provider, Drizzle, migrations       | Supabase Postgres + `drizzle/` — not SQLite/Neon as runtime |
| Astro / Bun / major deps                     | Version labels that match `package.json`                    |
| CI workflows (`.github/workflows/*`)         | What runs on PRs (`bun test src`, Prettier, etc.)           |
| Live URL, repo org, default term label       | Links, “current semester” data note, changelog path         |
| Editor login entry points                    | `/?editor=login`, in-app editing — not a separate admin app |
| Project layout (`src/pages`, `src/lib`, …)   | Folder tree in README matches reality                       |
| New user-visible features                    | Feature table or student-mode bullets                       |

**Pair with `.env.example`:** new server env vars get a commented line in `.env.example` and a README mention in the same change set.

### Before commit or PR

1. Re-read the README sections your change affects — dev setup, stack, contributing, data note.
2. Run **`bun run check:readme`** — fails on known stale phrases (Neon, `info.db` as runtime DB, `/src/routes`, `npm install`, wrong Astro major, “no automated test suite”).
3. If you changed env or scripts and README still looks fine, you probably missed an update — check again.

README-only overhauls are welcome; they still must pass `check:readme` and stay accurate against `package.json`, `.env.example`, and `AGENTS.md`.

## Verification

- After substantive changes: lint, relevant unit tests, and `bun run build` (local).
- For editor changes: [docs/editor-foundation-test-plan.md](docs/editor-foundation-test-plan.md).
- For PR QA: [docs/agentic-qa-process.md](docs/agentic-qa-process.md); separate automated evidence from browser-only checks.
- Avoid mutating production-like server data unless intentional and reversible. Restore accidental test mutations immediately.

## Cursor Cloud specific instructions

- Package manager is **Bun** (installed at `~/.bun/bin`). The startup update script runs `bun install --frozen-lockfile`. Use Bun, not npm, even though a npm lockfile may also be present.
- **A reachable Postgres is required; no local DB fallback.** Runtime DB is **Supabase** (`*.supabase.co`); `src/lib/db.ts` connects via `DATABASE_URL` (see `astro:env/server` in `astro.config.mjs`). Local `.env` must point at Supabase, not a stale Neon URL. `ADMIN_PASSWORD` is needed for admin/editor features. Apply migrations in `drizzle/` before first run.
- **Refreshing local `.env`:** Production/preview `DATABASE_URL` lives in Vercel env vars. When `.env` is empty or stale: `vercel env pull .env.vercel --environment=development --yes` (requires Vercel CLI linked to `stimmie/saan-ang-room`; room-tba.stimmie.dev; not a separate empty `room-tba` project; see `.vercel/project.json`), merge `DATABASE_URL` into `.env`, keep local `ADMIN_PASSWORD` if already set. `vercel env pull` often returns empty `""` for encrypted vars like `DATABASE_URL`; copy from Vercel UI (Settings → Environment Variables) or Supabase dashboard instead. Use the Supabase **session pooler** URL (`*.pooler.supabase.com`) for local dev. Or provide `DATABASE_URL` via Cursor Secrets.
- **`bun dev` without `DATABASE_URL`:** Server starts but SSR returns HTTP 500 (`EnvInvalidVariables: DATABASE_URL is missing`). Set a valid Supabase connection string in `.env` and restart.
- **Optional R2:** Image upload (`/api/admin/upload`) needs `R2_*` vars (see `.env.example`, `wrangler.jsonc`). App runs without them; upload UI shows a not-configured message.
- This is **Astro 7 SSR** (Vercel adapter). API routes under `src/pages/api/*` are server-rendered (`prerender = false`), and SSG entity pages (e.g. `/room/[slug]`) query the DB at build time; so `bun run build` fails without a working `DATABASE_URL`.
- `@electric-sql/pglite` (`idb://site-data`) is a **browser-side cache only**, not a server/dev database fallback.
- **PWA:** Workbox precaches `dist/client`; large client bundles affect offline install. See `astro.config.mjs` PWA config before adding heavy dependencies.
- Standard scripts: `bun dev` (`http://localhost:4321/`), `bun run build`, `bun preview`, `bun run lint`, `bun run format`, `bun test src`, `bun run check:readme`. PR CI runs Prettier check + unit tests; run full lint and build locally before merge.
