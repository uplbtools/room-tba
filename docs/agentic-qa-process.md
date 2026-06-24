# Agentic QA Process

Use this process when preparing an editor-focused PR for review. The goal is to let agents verify everything they can with evidence, while clearly marking browser-only checks that still need a human pass.

## Roles

- **QA coordinator:** owns the run, keeps scope tight, and writes the final PR QA summary.
- **Static verifier:** checks formatting, lints, build, git status, redirects, and database/schema presence.
- **Runtime verifier:** runs targeted API checks against the local dev server and confirms auth/redirect behavior.
- **Human browser verifier:** performs drag/drop and visual checks that cannot be trusted from shell output alone.

One agent can play multiple roles, but the report must separate automated evidence from manual observations.

## Required Inputs

- PR URL or branch name.
- Local `.env` with `NEON_CONNECTION_STRING` and `ADMIN_PASSWORD`.
- Current test checklist: `docs/editor-foundation-test-plan.md`.
- A running local dev server on the expected port, usually `http://localhost:4321`.

## Automated Checks

Run these before asking for browser QA:

```sh
git status --short --branch
bunx prettier --check .
bun run build
curl -I http://localhost:4321/admin
curl -I http://localhost:4321/admin/login
curl -I 'http://localhost:4321/?editor=login'
```

For editor-history work, also confirm the table exists:

```sh
bun -e 'import { config } from "dotenv"; import pg from "pg"; config({ path: ".env" }); const client = new pg.Client({ connectionString: process.env.NEON_CONNECTION_STRING }); await client.connect(); const { rows } = await client.query("select to_regclass($1) as table_name", ["public.editor_history"]); console.log(JSON.stringify(rows[0])); await client.end();'
```

Expected automated evidence for the current editor foundation:

- `/admin` redirects to `/?editor=login`.
- `/admin/login` redirects to `/?editor=login`.
- `/?editor=login` returns `200`.
- The rendered layout includes `name="viewport"` with `initial-scale=1`.
- `bun run build` passes.
- `editor_history` exists when history code is in scope.
- Working tree is clean before updating or merging the PR.

## Browser Checks

Do these in the real app because shell checks cannot prove visual state, drag/drop behavior, keyboard shortcuts, or rollback animation:

- Login popup opens from `/?editor=login`.
- Login popup opens from the map control button.
- Edit mode toggles on and off.
- Editor toolbar is readable, compact, and does not overlap toasts.
- Building drag saves and updates toolbar status.
- Dorm drag saves and updates toolbar status.
- Failed save rolls the marker back and names the exact entity.
- Undo/Redo buttons work.
- `Ctrl+Z` / `Cmd+Z` triggers undo.
- `Ctrl+Y` / `Cmd+Y` triggers redo.
- `Shift+Ctrl+Z` / `Shift+Cmd+Z` triggers redo.

## Mobile Browser Checks

Do these with a narrow viewport or a real phone-sized browser. Agents may verify static CSS and viewport metadata, but should not claim touch behavior was tested without a real browser interaction.

- `/?editor=login` opens a login modal that fits within the viewport.
- Map controls are reachable and tappable.
- Edit mode toolbar is readable and does not cover the search or side panel.
- Undo/Redo buttons remain large enough for touch.
- Touch-dragging a building pin saves without excessive accidental map panning.
- Touch-dragging a dorm pin saves without excessive accidental map panning.
- Draggable affordances are understandable without hover-only labels.
- Failed save and rollback feedback remains readable on mobile.

Avoid mutating real shared data casually. If a browser test moves a marker in Neon, move it back or use Undo before ending the run.

## Conflict Checks

For optimistic concurrency, prefer API-level tests over manual races:

1. Fetch or note the current entity version.
2. Send one successful PATCH using that version.
3. Send a second PATCH with the old version.
4. Confirm the second response is `409 Conflict` and includes the latest entity row.

Do not leave test coordinates changed. Restore the entity or test against disposable data.

## Reporting Format

Use this structure in the PR comment or PR body:

```md
## QA Summary

Automated:

- [x] Build passed: `<command/output summary>`
- [x] Admin redirects verified: `/admin`, `/admin/login`
- [x] Editor history table verified: `editor_history`
- [x] Mobile viewport metadata verified

Manual browser:

- [x] Login popup opens
- [x] Building drag save works
- [ ] Dorm drag save not tested
- [ ] Mobile touch drag not tested

Known gaps:

- <anything not tested and why>

Follow-up:

- <issues or PRs to file next>
```

Never claim a browser interaction was tested unless someone actually performed it in the UI.
