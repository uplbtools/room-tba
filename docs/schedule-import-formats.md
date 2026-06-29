# Schedule import formats

Personal schedule import accepts exports from [AMIS Schedule Extractor](https://github.com/Towphe/amis-schedule-extractor) or a simple CSV. Instructor names and other faculty PII are stripped on parse and never stored server-side.

## JSON (preferred)

Top-level array of class rows, or a paginated wrapper (`classes.data` / `data`).

Required fields per row:

| Field         | Aliases                   | Example                  |
| ------------- | ------------------------- | ------------------------ |
| `course_code` | `courseCode`, `course`    | `"CMSC 123"`             |
| `section`     | `sec`                     | `"A"`                    |
| `type`        | `class_type`, `classType` | `"LEC"`                  |
| `schedule`    | —                         | `["MW 08:00AM-09:00AM"]` |

Schedule slots use the same compact AMIS format parsed by `parseScheduleTime()` in `src/lib/schedule-renderer.ts` (e.g. `TTh 01:00PM-02:30PM`).

Rows may include `class_dates` instead of `schedule`; these are normalized to the same string format.

### Sample sanitized payload

```json
[
  {
    "course_code": "CMSC 123",
    "section": "A",
    "type": "LEC",
    "schedule": ["MW 08:00AM-09:00AM"]
  },
  {
    "course_code": "CMSC 123",
    "section": "A",
    "type": "LAB",
    "schedule": ["T 01:00PM-04:00PM"]
  }
]
```

Do **not** commit exports containing `faculty`, `formatted_name`, `email`, or similar keys. The client parser strips those fields before matching.

## CSV fallback

Header row required. Column names (case-insensitive):

- `course_code` (or `course`, `code`)
- `section` (or `sec`)
- `type` (or `class_type`)
- `schedule` (optional; semicolon-separated slots)

Example:

```csv
course_code,section,type,schedule
CMSC 123,A,LEC,MW 08:00AM-09:00AM
CMSC 123,A,LAB,T 01:00PM-04:00PM
```

## Matching and routing

1. Rows match institutional `classes` for the active term (`course_code` + `section` + `type`).
2. Room codes resolve to building coordinates via local PGlite cache or `/api/rooms`.
3. Unresolved rows (no match, no room, thesis/special-problem types) appear in the UI but are skipped for routing.
4. Imported data persists in `sessionStorage` only for the current browser tab session.

## Related code

- Parser: `src/lib/schedule-import/parse-import.ts`
- Matcher: `src/lib/schedule-import/match-classes.ts`
- Weekday ordering: `src/lib/schedule-import/day-stops.ts`
- UI: Map tools flyout → Schedule → `ScheduleImportPanel.svelte`
- Store: `scheduleRouteStore` in `src/lib/store.svelte.ts`
