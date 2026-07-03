---
name: amis-term-import
description: Imports and triages AMIS/CRS class schedules into Room TBA by term_id. Use when wrong term bugs, AMIS fetch/import, term labels, skipped rows, import:amis-classes, or data issues about schedules and term_id 1251/1252/1253.
---

# AMIS term import

Full policy: [AGENTS.md § AMIS class imports](../../AGENTS.md#amis-class-imports). Never commit tokens or unsanitized AMIS JSON.

## CRS term IDs (source of truth)

Chronological within the academic year. **`terms.id` must equal the CRS id** passed to `--term-id`.

| CRS id | Period | Typical dates (AY 2025–2026) |
| --- | --- | --- |
| **1251** | 1st semester | Aug–Dec |
| **1252** | 2nd semester | Jan–May |
| **1253** | Midyear | Jun–Jul |

Fix labels/dates in the `terms` row. **Never move class rows between ids** to fix a naming mix-up.

## Commands

```sh
# Fetch once (needs fresh AMIS_BEARER_TOKEN ~1h TTL)
bun run import:amis-classes -- --term-id 1252 --fetch

# Re-import from cached JSON (no token)
bun run import:amis-classes -- --term-id 1252 --replace

# Scrub PII from local exports
bun run import:amis-classes -- --scrub-exports
```

Cached files: `data/amis-*-<term_id>.json` (gitignored).

## Import filter (by design)

AMIS returns all section types; Room TBA imports **LEC/LAB with a matched room** only.

- 12k fetch → ~3k import (2nd sem) can be normal.
- Midyear ~120 rows can be normal.

## Two skip buckets (do not conflate)

| Bucket | Cause | Action |
| --- | --- | --- |
| **By design** | THE, SPR, PRA, DSR, IND, etc. no `facility_id` | Expected; room panel explains |
| **Data gap (#300)** | LEC/LAB with facility string that does not match `rooms.room_code` | Alias/typo work, not term surgery |

## Triage checklist (wrong term reports)

1. Sample `classes.schedule` per `term_id` (midyear = intensive daily blocks; 2nd sem = weekly TTH/MWF).
2. Confirm `/api/terms` labels match CRS table above.
3. Re-import **correct CRS id** with `--replace` if data is wrong.
4. **Do not** re-apply `drizzle/0012_reassign_second_sem_classes.sql` or copy 0009/0010 label assumptions.

## PII rules

- `sanitizeAmisRow()` strips instructor fields before JSON is written.
- DB stores course, section, schedule, room, term only.
- Never commit `data/amis-*.json` or paste `AMIS_BEARER_TOKEN` in issues/chat.

## Verification

```sh
bun test src/lib/amis/   # fixture tests only in CI; never live --fetch in CI
```

After import: spot-check row counts and schedule patterns; update issue with term id and sample schedules.
