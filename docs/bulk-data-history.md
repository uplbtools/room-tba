# Bulk data operations and the audit trail

`editor_history` is the audit timeline for campus data. Every edit made through
the app writes a row there ([`recordEditorHistory`](../src/lib/services/admin-service.ts)).
Edits made **directly against the database** — a merge script, a one-off SQL
fixup, an import correction — do not, so the entity's history silently claims
nothing happened. That is the gap this page closes.

**Rule: a maintenance script that changes campus data records history in the
same run.** Not "later", not in a spreadsheet.

## The helper

[`src/lib/services/bulk-history.ts`](../src/lib/services/bulk-history.ts)
writes the same row shape the app writes, with:

| Field        | Value                                                                       |
| ------------ | --------------------------------------------------------------------------- |
| `entityType` | `room`, `building`, `alias`, `proposal`, …                                  |
| `entityId`   | the affected row, or `0` when the operation spans rows with no single id    |
| `before` / `after` | what changed, as JSON                                                 |
| `editedBy`   | an actor label — `maintenance-script` by default, never a person's name     |
| `summary`    | `[bulk:<opKey>] <reason>` — the free-text reason, prefixed with the op key  |

Scripts cannot import `@lib/db` (it reads `astro:env/server`, which only exists
inside Astro), so the caller passes its own Drizzle instance. `openDb()` in
[`scripts/record-bulk-history.ts`](../scripts/record-bulk-history.ts) does that
in five lines.

### Idempotency

The `opKey` is stamped into the summary, so re-running a backfill skips any
`(entityType, entityId, opKey)` already present. A half-finished run is safe to
resume; a nervous second run is a no-op.

Pick a dated, kebab-case key: `2026-08-03-duplicate-room-merge`.

### Dry run is the default

`recordBulkHistory()` writes nothing unless the caller passes `dryRun: false`,
and both scripts require `--apply` on the command line. Writing to the audit log
of the production database should take a deliberate keystroke.

## Recording a new operation

From a script:

```ts
import { recordBulkHistory } from "../src/lib/services/bulk-history";
import { openDb } from "./record-bulk-history";

const { db, close } = openDb();
await recordBulkHistory(
  db,
  rooms.map((room) => ({
    opKey: "2026-09-01-room-code-fix",
    entityType: "room",
    entityId: room.id,
    before: { roomCode: room.before },
    after: { roomCode: room.after },
    reason: "collapsed double spaces introduced by the 2019 import",
  })),
  { dryRun: !apply },
);
await close();
```

Or from a JSON file, without writing a script:

```sh
bun run record:bulk-history -- --ops ops.json            # dry run, prints the plan
bun run record:bulk-history -- --ops ops.json --apply    # write
```

`ops.json` is a JSON array of `BulkOperation`. Bad input (an op key with
spaces, an over-long `entityType`, a missing reason) fails before any write.

## Maintainer: backfilling 2026-08-03 / 04

The corrections made on 2026-08-03 and 2026-08-04 ran as direct SQL and left no
history. [`scripts/backfill-bulk-history.ts`](../scripts/backfill-bulk-history.ts)
records them after the fact:

| Op key                              | What it records                                                                                  |
| ----------------------------------- | ------------------------------------------------------------------------------------------------ |
| `2026-08-03-sds-rooms-to-che`       | 7 rooms moved from CVM-IAS Communal to the CHE Building (the SDS fix)                            |
| `2026-08-03-room-building-audit`    | 31 rooms given their correct building by a manual audit                                          |
| `2026-08-03-duplicate-room-merge`   | 16 duplicate room groups merged: 222 class/final-exam rows repointed, 15 rooms deleted, spellings kept as aliases |
| `2026-08-04-sds-therio-aliases`     | SDS and therio alias insertions                                                                  |
| `2026-08-04-proposal-28-directions` | proposal #28's patch edited to strip an internal admin note from `directions`                    |

Review the plan first, then apply:

```sh
bun run backfill:bulk-history                # dry run — prints every row it would write
bun run backfill:bulk-history -- --apply     # maintainer only, writes to DATABASE_URL
```

Re-running after `--apply` prints `5 operations: 0 new, 5 already recorded`.

## Maintainer: campus-audit building links

The 17 name- and proximity-matched organization links from #891 are explicit in
`scripts/apply-campus-audit-links.ts`. It refuses a row that has changed since
the audit and writes one `editor_history` row per update.

```sh
bun run apply:campus-audit-links -- --prod
bun run apply:campus-audit-links -- --prod --apply
```

### Snapshots

If the pre-operation JSON dumps are still on disk, the script enriches the
`before` payload and writes one row per affected room instead of a single
summary row. It looks in `--snapshots <dir>`, else under
`/tmp/claude-1000/-home-stimmie-dev-uplbtools-room-tba/*/scratchpad/`, for:

- `room-merge-snapshot.json` — the duplicate-room candidates and their referencing rows
- `rooms-building-snapshot.json` — rooms before the building audit
- `rooms-map-snapshot.json` — room map positions

Missing snapshots are not an error; the operation is still recorded, with counts
instead of per-room detail. The merge snapshot deliberately does **not** get
per-room rows: it records which rooms were *candidates*, not which were kept, so
per-room rows would attach "merged" history to rooms that were never touched.

If the snapshots are gone entirely, hand the list in directly:

```sh
bun run backfill:bulk-history -- --ops ops.json
```

## Tests

[`src/lib/services/bulk-history.test.ts`](../src/lib/services/bulk-history.test.ts)
covers the row shape, the column-limit validation, idempotent replay, and the
backfill operation list. It runs in `bun run test`.
