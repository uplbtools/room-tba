# AMIS facility aliases

AMIS `facility_id` strings often differ from `rooms.room_code` (hyphens, spacing, abbreviations). The import script resolves rooms in two passes:

1. **Direct match** — normalized facility string equals a room code
2. **Alias match** — normalized string matches an `aliases` row with `target_type = room`

## Add an alias (editor / admin)

Use the admin aliases API or insert via Drizzle:

- `alias`: human-readable AMIS string (e.g. `PS B-203`)
- `normalized_alias`: same normalization as import (`normalizeFacilityKey`)
- `target_type`: `room`
- `target_id`: `rooms.id` for the canonical room

Re-run the import for the term; the report shows **alias-matched** counts separately from direct matches.

## Import report categories

| Category | Meaning |
| --- | --- |
| Direct room match | Facility string matched `rooms.room_code` |
| Via alias | Matched through `aliases` (`target_type = room`) |
| Missing facility | AMIS row has no facility (TBA) — **skipped**, not pinned |
| Unmatched facility | Non-empty string with no room or alias — fix alias or room data |

## TBA policy

Sections with no facility after COM are **omitted from the map** today. They remain visible in the import report so editors can add aliases or wait for AMIS updates. We do not assign a synthetic default room id.
