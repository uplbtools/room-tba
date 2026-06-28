# Room TBA Agent Guide

## Doc map

Read the right doc for the task — do not rely on this file alone for detailed checklists.

| When                                             | Read                                                                                                                    |
| ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| Starting a coding session, commit, or PR         | [.cursor/skills/room-tba-agent-workflow/SKILL.md](.cursor/skills/room-tba-agent-workflow/SKILL.md)                      |
| Map chrome, Entry zones, flyouts, 320/768 layout | [.cursor/rules/map-layout.mdc](.cursor/rules/map-layout.mdc) + [docs/map-ui-mode-matrix.md](docs/map-ui-mode-matrix.md) |
| Side panel / entity detail views                 | [.cursor/rules/side-panel.mdc](.cursor/rules/side-panel.mdc)                                                            |
| Drizzle, API routes, migrations, PGlite          | [.cursor/rules/data-and-migrations.mdc](.cursor/rules/data-and-migrations.mdc)                                          |
| Stores and client state                          | [.cursor/rules/svelte-stores.mdc](.cursor/rules/svelte-stores.mdc)                                                      |
| PR QA evidence and reporting                     | [docs/agentic-qa-process.md](docs/agentic-qa-process.md)                                                                |
| Editor manual checklist                          | [docs/editor-foundation-test-plan.md](docs/editor-foundation-test-plan.md)                                              |
| Issue-linked work / keeping specs current        | [docs/issue-hygiene.md](docs/issue-hygiene.md)                                                                          |

## How to work

- **Bias toward action.** Do not pad estimates, over-explain tradeoffs, or defer work that is clearly scoped.
- **Default to implementing** when the request is concrete and the codebase path is discoverable. Ask only when a product decision is genuinely ambiguous or irreversible.
- **One pass is often enough.** Prefer a focused implementation plus verification over long planning loops or repeated “want me to…?” prompts.
- **Preserve the dirty tree.** Do not revert unrelated user changes unless explicitly asked.
- **Keep scope tight.** Avoid opportunistic refactors outside the request.
- **Keep GitHub issues current** when work is tied to `#NNN` — issues hold implementation specifics that drift fast. See [docs/issue-hygiene.md](docs/issue-hygiene.md).

## GitHub issues

Issues are living specs (paths, schema, acceptance criteria). When coding quickly, update them in the same session as the code:

- **Before starting:** `gh issue view N` — verify cited files/APIs still exist; fix stale body text first.
- **While implementing:** if the approach changes, edit the issue — don't leave wrong paths for the next agent.
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

Production readiness is backed by repo automation — do not disable without replacing:

| Tool                  | Config                                                                               | What it does                                     |
| --------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------ |
| **Dependabot**        | [`.github/dependabot.yml`](.github/dependabot.yml)                                   | Weekly Bun + GitHub Actions version PRs          |
| **CodeQL**            | [`.github/workflows/codeql.yml`](.github/workflows/codeql.yml)                       | Static analysis on push/PR + weekly schedule     |
| **Dependency Review** | [`.github/workflows/dependency-review.yml`](.github/workflows/dependency-review.yml) | Blocks PRs introducing critical CVEs in new deps |
| **CI**                | [`.github/workflows/ci.yml`](.github/workflows/ci.yml)                               | Prettier + unit tests                            |

Enable **Dependabot security updates** and **secret scanning** in GitHub repo Settings → Code security if not already on (org defaults may apply). CodeQL SARIF appears under Security → Code scanning.

## Commits

- **When you finish a scoped task, commit it** unless the user says not to. Do not leave completed work uncommitted across turns.
- **Use [Conventional Commits](https://www.conventionalcommits.org/)** — required for semantic-release on `main`. Format: `type(scope): imperative summary` (e.g. `feat(map-chrome): add transit route panel`, `fix(security): validate image URLs`). Common types: `feat`, `fix`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`. Scope is optional but preferred when the change is localized.
- **One logical unit per commit** — atomic, reviewable, GPG-signed: `git commit -S -m "$(cat <<'EOF' … EOF)"`.
- Stage only files that belong together; write a message that states _why_, not a file list.
- Do not push unless asked. Do not amend or force-push unless the user’s git rules allow it.

## Architecture (short)

- **App:** Astro 7 SSR + Svelte 5 islands, Vercel adapter, Bun.
- **Server data:** Supabase Postgres via Drizzle ([`src/lib/db.ts`](src/lib/db.ts), [`drizzle/schema.ts`](drizzle/schema.ts), migrations in `drizzle/`).
- **Client offline cache:** PGlite in IndexedDB ([`src/lib/local/data/pgliteDB.ts`](src/lib/local/data/pgliteDB.ts)) — schema is maintained separately and **can drift** from Drizzle; update both when changing tables.
- **Client state:** [`src/lib/store.svelte.ts`](src/lib/store.svelte.ts) (monolithic store module; import via `@lib/store.svelte`).
- **Auth:** HMAC cookie `admin_session` + bcrypt `admin_users` gates `/api/admin/*`. Supabase Auth ([`src/lib/supabase/*`](src/lib/supabase/)) is additive in middleware; intended long-term consolidation target.
- **Do not edit:** `drizzle-migrations/` (archived SQLite history). Do not add browser `/admin` pages as the editor surface.

## Product direction

- Prefer editing in the main app over building a separate admin dashboard.
- The editor login should use the in-app popup. `/admin` browser pages should redirect into the main app login flow.
- Keep the read and edit experiences colocated: if a user can view an entity in the app, an editor should eventually edit it there.
- Editor capabilities (map pin editing, proposals, optimistic concurrency, version history, undo/redo) live in the main map app — extend in place.

## Editor UX rules

- No decorative or attention-seeking animations. Do not add pulsing/“live” dots, blinking badges, glowing rings, bouncing elements, or similar gimmicks. Keep the UI calm and static; only animate when it communicates real state (e.g. a spinner during a save).
- Layout must never overflow or overlap. Buttons and chips must stay inside their container, controls must wrap gracefully on narrow widths, and text must truncate (ellipsis) instead of colliding with neighbors. Verify the header/action rows at narrow widths before finishing.
- Keep editor controls compact and map-friendly. Avoid large modals for persistent edit state.
- Do not show duplicate feedback surfaces. If the editor toolbar already explains the state, do not also show an info toast.
- Failed saves must not leave the UI implying success. Roll markers back to the previous local position, or to the latest server position on conflict.
- Error messages should name the exact entity that failed without repeating generic wording.
- Support common shortcuts in map edit mode: `Ctrl+Z` / `Cmd+Z` for undo, `Ctrl+Y` / `Cmd+Y` and `Shift+Ctrl+Z` / `Shift+Cmd+Z` for redo.

## UI guardrails

Map and side-panel layout rules are detailed in glob-scoped Cursor rules — read them before editing matched files.

- **Map chrome:** Entry zones only; one Map tools flyout; verify 320px + 768px. See [map-layout.mdc](.cursor/rules/map-layout.mdc) and [map-ui-mode-matrix.md](docs/map-ui-mode-matrix.md).
- **Side panel:** Header → body → directions → footer; parity across Room/Building/Dorm results. See [side-panel.mdc](.cursor/rules/side-panel.mdc).

## Data integrity

- Use optimistic concurrency for editor writes. Send the version the client last saw, and return `409 Conflict` with the latest row if it is stale.
- Missing client versions are a transitional compatibility fallback only; new editor surfaces should send versions.
- Current entity tables store the latest state. `editor_history` stores the audit timeline.
- Reverts should create new history entries instead of rewriting or deleting old history.
- Every admin write should refresh the relevant sync key so clients can detect changed data.

## Database and APIs

- Supabase Postgres is the runtime source of truth via `DATABASE_URL` (not `NEON_CONNECTION_STRING`). Code, Drizzle, seeds, and the Astro env schema all use `DATABASE_URL`. On Vercel, name the env var `DATABASE_URL`.
- Supabase JS (`@supabase/supabase-js` + `@supabase/ssr`) is additive: `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_PUBLISHABLE_KEY` power Auth/client features via `src/lib/supabase/*`. Keep using Drizzle + `DATABASE_URL` for existing Postgres queries unless a feature explicitly needs the JS client.
- Drizzle schema changes need a matching SQL migration in `drizzle/`. Apply pending migrations to Supabase before deploying code that depends on them — skipped migrations cause runtime query failures (e.g. missing `0007_add_event_image_url.sql` leaves out `events.image_url` and breaks event loading).
- **PGlite drift:** offline tables in `pgliteDB.ts` must stay aligned with server schema and with [`src/lib/local/data/sync.ts`](src/lib/local/data/sync.ts) consumers.
- Admin API routes live under `/api/admin/*` and must keep auth checks.
- Keep PATCH routes field-level and partial so unrelated edits do not clobber each other.

## Verification

- After substantive changes: lint, relevant unit tests, and `bun run build` (local).
- For editor changes: [docs/editor-foundation-test-plan.md](docs/editor-foundation-test-plan.md).
- For PR QA: [docs/agentic-qa-process.md](docs/agentic-qa-process.md) — separate automated evidence from browser-only checks.
- Avoid mutating production-like server data unless intentional and reversible. Restore accidental test mutations immediately.

## Cursor Cloud specific instructions

- Package manager is **Bun** (installed at `~/.bun/bin`). The startup update script runs `bun install --frozen-lockfile`. Use Bun, not npm, even though a npm lockfile may also be present.
- **A reachable Postgres is required — no local DB fallback.** Runtime DB is **Supabase** (`*.supabase.co`); `src/lib/db.ts` connects via `DATABASE_URL` (see `astro:env/server` in `astro.config.mjs`). Local `.env` must point at Supabase, not a stale Neon URL. `ADMIN_PASSWORD` is needed for admin/editor features. Apply migrations in `drizzle/` before first run.
- **Refreshing local `.env`:** Production/preview `DATABASE_URL` lives in Vercel env vars. When `.env` is empty or stale: `vercel env pull .env.vercel --environment=development --yes` (requires Vercel CLI linked to `stimmie/saan-ang-room` — room-tba.stimmie.dev — not a separate empty `room-tba` project; see `.vercel/project.json`), merge `DATABASE_URL` into `.env`, keep local `ADMIN_PASSWORD` if already set. `vercel env pull` often returns empty `""` for encrypted vars like `DATABASE_URL` — copy from Vercel UI (Settings → Environment Variables) or Supabase dashboard instead. Use the Supabase **session pooler** URL (`*.pooler.supabase.com`) for local dev. Or provide `DATABASE_URL` via Cursor Secrets.
- **`bun dev` without `DATABASE_URL`:** Server starts but SSR returns HTTP 500 (`EnvInvalidVariables: DATABASE_URL is missing`). Set a valid Supabase connection string in `.env` and restart.
- **Optional R2:** Image upload (`/api/admin/upload`) needs `R2_*` vars (see `.env.example`, `wrangler.jsonc`). App runs without them; upload UI shows a not-configured message.
- This is **Astro 7 SSR** (Vercel adapter). API routes under `src/pages/api/*` are server-rendered (`prerender = false`), and SSG entity pages (e.g. `/room/[slug]`) query the DB at build time — so `bun run build` fails without a working `DATABASE_URL`.
- `@electric-sql/pglite` (`idb://site-data`) is a **browser-side cache only**, not a server/dev database fallback.
- **PWA:** Workbox precaches `dist/client`; large client bundles affect offline install. See `astro.config.mjs` PWA config before adding heavy dependencies.
- Standard scripts: `bun dev` (`http://localhost:4321/`), `bun run build`, `bun preview`, `bun run lint`, `bun run format`, `bun test src`. PR CI runs Prettier check + unit tests; run full lint and build locally before merge.
