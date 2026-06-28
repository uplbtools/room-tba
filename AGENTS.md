# Room TBA Agent Guide

## Agent execution

- **Bias toward action.** Training data reflects human pacing; in this repo you can read, edit, verify, and commit much faster. Do not pad estimates, over-explain tradeoffs, or defer work that is clearly scoped.
- **Default to implementing** when the request is concrete and the codebase path is discoverable. Ask only when a product decision is genuinely ambiguous or irreversible.
- **One pass is often enough.** Prefer a focused implementation plus build/lint over long planning loops or repeated “want me to…?” prompts.
- **Adjust verification to change size.** Small UI or store tweaks need targeted checks; run `bun run build` once before committing substantive work.

## Commits

- **When you finish a scoped task, commit it** unless the user says not to. Do not leave completed work uncommitted across turns.
- **One logical unit per commit** — atomic, reviewable, GPG-signed: `git commit -S -m "$(cat <<'EOF' … EOF)"`.
- Stage only files that belong together; write a message that states _why_, not a file list.
- Do not push unless asked. Do not amend or force-push unless the user’s git rules allow it.

## Product Direction

- Prefer editing in the main app over building a separate admin dashboard.
- The editor login should use the in-app popup. `/admin` browser pages should redirect into the main app login flow.
- Keep the read and edit experiences colocated: if a user can view an entity in the app, an editor should eventually edit it there.
- Treat the current PR as the editor foundation: map pin editing, admin entry, optimistic concurrency, version history, undo/redo, and manual verification.

## Editor UX Rules

- No decorative or attention-seeking animations. Do not add pulsing/“live” dots, blinking badges, glowing rings, bouncing elements, or similar gimmicks. Keep the UI calm and static; only animate when it communicates real state (e.g. a spinner during a save).
- Layout must never overflow or overlap. Buttons and chips must stay inside their container, controls must wrap gracefully on narrow widths, and text must truncate (ellipsis) instead of colliding with neighbors. Verify the header/action rows at narrow widths before finishing.
- Keep editor controls compact and map-friendly. Avoid large modals for persistent edit state.
- Do not show duplicate feedback surfaces. If the editor toolbar already explains the state, do not also show an info toast.
- Failed saves must not leave the UI implying success. Roll markers back to the previous local position, or to the latest server position on conflict.
- Error messages should name the exact entity that failed without repeating generic wording.
- Support common shortcuts in map edit mode: `Ctrl+Z` / `Cmd+Z` for undo, `Ctrl+Y` / `Cmd+Y` and `Shift+Ctrl+Z` / `Shift+Cmd+Z` for redo.

## Map motion

- Campus auto-rotate is decorative only: **off by default**, opt-in via Map tools → View → Campus tour.
- Honor `prefers-reduced-motion: reduce` (no auto-rotate).
- Never auto-rotate during edit/proposal/placement modes, terrain or jeepney routes, entity selection, or after the user interacts with the map (pan/zoom/drag).

## Map layout guardrails

- Map chrome mounts in Entry zones (top / map / bottom / ephemeral). See `docs/map-ui-mode-matrix.md`.
- Use `.app-layout` CSS vars for spacing — no magic fixed offsets.
- Map chrome contrast tokens (`--map-chrome-surface`, borders, shadows) live on `.app-layout` in `Entry.svelte`. Surfaces use a warm off-white tint so controls float above light basemap tiles; tune there rather than per-component whites.
- New fixed overlays outside Entry zones require updating the mode matrix.
- One Map tools flyout (`mapToolsStore`); contributor propose menu on LocationButton; editor tools via `editorChromeStore` (top-bar chip + shelf; shield FAB opens the same shelf).
- Before merge on map chrome changes: verify 320px + 768px browse, edit mode, and map tools open.

## Side panel guardrails

- Entity detail views live in the MainControls drawer (`controls/*Result*.svelte`, `room/RoomResult.svelte`). See `.cursor/rules/side-panel.mdc`.
- Layout zones: **header** (title, context, one actions row) → **body** → **directions** (merged) → **footer** (subtle links). Shared styles in `controls/entity-detail.css`.
- Do not add new full-width button rows or colored boxes without consolidating existing ones. Match map-chrome action chip patterns.
- Check RoomResult + BuildingResult + DormResult for parity when changing any entity detail view.

## Data Integrity

- Use optimistic concurrency for editor writes. Send the version the client last saw, and return `409 Conflict` with the latest row if it is stale.
- Missing client versions are a transitional compatibility fallback only; new editor surfaces should send versions.
- Current entity tables store the latest state. `editor_history` stores the audit timeline.
- Reverts should create new history entries instead of rewriting or deleting old history.
- Every admin write should refresh the relevant sync key so clients can detect changed data.

## Database And APIs

- Neon Postgres is the runtime source of truth.
- Drizzle schema changes need a matching SQL migration in `drizzle/`.
- Admin API routes live under `/api/admin/*` and must keep auth checks.
- Browser-facing `/admin` pages are intentionally not the default editor surface.
- Keep PATCH routes field-level and partial so unrelated edits do not clobber each other.

## Verification

- After substantive changes, run formatting, lints for edited files, and `bun run build`.
- For editor changes, also use `docs/editor-foundation-test-plan.md` as the manual PR checklist.
- For PR QA, follow `docs/agentic-qa-process.md` and separate automated evidence from browser-only checks.
- Avoid testing by mutating production-like Neon data unless the change is intentional and reversible. Restore any accidental test mutations immediately.

## Cursor Cloud specific instructions

- Package manager is **Bun** (installed at `~/.bun/bin`). The startup update script runs `bun install --frozen-lockfile`. Use Bun, not npm, even though a npm lockfile may also be present.
- **A reachable Postgres is required to run or build the app — there is no local DB fallback.** `src/lib/db.ts` connects via the `NEON_CONNECTION_STRING` server env var (see `astro:env/server` schema in `astro.config.mjs`); `ADMIN_PASSWORD` is needed for admin/editor features. Provide these as Cursor Secrets, or run a local Postgres and point `NEON_CONNECTION_STRING` at it. Apply the SQL migrations in `drizzle/` to that database before first run.
- This is **Astro 6 SSR** (Vercel adapter). API routes under `src/pages/api/*` are server-rendered (`prerender = false`), and the SSG entity pages (e.g. `/room/[slug]`) also query the DB at build time — so even `bun run build` fails without a working `NEON_CONNECTION_STRING`.
- `@electric-sql/pglite` (`idb://site-data`) is a **browser-side cache only**, not a server/dev database fallback.
- Standard scripts live in `package.json`: `bun dev` (dev server on `http://localhost:4321/`), `bun run build`, `bun preview`, `bun run lint` (`prettier --check . && eslint .`), `bun run format`. There is no automated test suite; verify changes via build + manual browser testing.
