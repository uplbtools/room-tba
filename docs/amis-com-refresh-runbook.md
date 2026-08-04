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
- Stale sections **remain** unless you pass `, replace-term`

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

1. Import bumps the `classes` sync key: browsers refetch on next online visit (no redeploy).
2. Open the map, pick the term in the status bar, search a course that changed.
3. Confirm room and schedule match the latest export.

## Cadence

During active COM (midyear Jun–Jul, sem start Jan/May), refresh **weekly** or whenever editors report AMIS posted a new dump.

## Facility aliases

Unmatched AMIS facility strings can be mapped via `aliases` rows with `target_type = room`. See [amis-facility-aliases.md](./amis-facility-aliases.md).

## When AMIS fetch fails

See [amis-contingency-runbook.md](./amis-contingency-runbook.md) for 403, rate limits, token expiry, and offline import paths.

## TBA sections

LEC/LAB/RCT/CPT rows whose facility is missing or unmatched import with `room_id NULL` (no map pin; they appear in the report under “Missing facility” / “unmatched facility”). The app shows them as “No assigned room” plus a hedged probable-location hint from the section’s department (`acad_org` decoded via `data/acad-orgs.json`) or its course/department room history (#846). Unmatched facility strings are still an alias problem: see issue #300.

### Backfill `acad_group` / `acad_org` (#846)

`classes.acad_group` and `classes.acad_org` (migration `drizzle/0042_add_class_acad_org.sql`) are populated by the importer. After applying the migration, rerunning the import over the 9 cached term JSONs fills them for existing rows (upsert by natural key; no AMIS fetch, no `--replace-term` needed):

```sh
DATABASE_URL=… bun run backfill:acad-orgs
```

(equivalent to `bun run import:amis-classes -- --term-id <id>` for 1231 1232 1241 1242 1243 1251 1252 1253 1261). Prod backfill is a maintainer step after merge — never run it from CI.
