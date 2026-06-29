# AMIS class refresh during COM

Use this when AMIS publishes an updated class export during **change of matriculation (COM)**.

## Prerequisites

- `DATABASE_URL` in `.env` (Supabase Postgres)
- Sanitized export at `data/amis-*-{termId}.json`, or a fresh fetch:

```sh
AMIS_BEARER_TOKEN=… AMIS_SESSION_ID=… \
  bun run import:amis-classes -- --term-id 1252 --fetch
```

Bearer tokens expire in about an hour. Fetch once, then reuse the saved JSON for repeat imports.

## Refresh a term (default upsert)

```sh
DATABASE_URL=… bun run import:amis-classes -- --term-id 1252
```

This **upserts** by natural key (`term_id` + course + section + type):

- New sections are inserted
- Changed schedules/rooms/titles are updated
- Unchanged rows are left alone
- Stale sections **remain** unless you pass `--replace-term`

The script prints a categorized report (room matches, TBA/missing, unmatched facilities, DB diff).

## Remove stale sections after COM

When AMIS drops sections entirely, pass:

```sh
DATABASE_URL=… bun run import:amis-classes -- --term-id 1252 --replace-term
```

Rows for that term that are no longer in the export are deleted after upsert.

## Dry run

```sh
bun run import:amis-classes -- --term-id 1252 --dry-run
```

## Verify in the app

1. Import bumps the `classes` sync key — browsers refetch on next online visit (no redeploy).
2. Open the map, pick the term in the status bar, search a course that changed.
3. Confirm room and schedule match the latest export.

## Cadence

During active COM (midyear Jun–Jul, sem start Jan/May), refresh **weekly** or whenever editors report AMIS posted a new dump.

## Facility aliases

Unmatched AMIS facility strings can be mapped via `aliases` rows with `target_type = room`. See [amis-facility-aliases.md](./amis-facility-aliases.md).

## TBA sections

Rows with no `facility_id` are **not imported** (no map pin). They appear in the import report under “Missing facility”. Product policy: list-only / no pin until a room is known — see issue #300.
