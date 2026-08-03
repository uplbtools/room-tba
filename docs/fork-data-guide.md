# Fork data guide: from "my registrar gives me X" to a working map

This is the data half of forking Room TBA for another campus. The code half
(branding, map config, what to delete) lives in the
[fork wiki page](https://room-tba.uplb.tools/wiki/fork-for-your-campus). You
do not need to write an importer or recreate a campus dataset before seeing
the app work — seed the sample campus first, then replace it with real data.

## 1. Seed the sample campus

`data/sample-campus/` holds a small fictional school — **Evergreen Park
College**: 6 buildings, 12 rooms, 2 organizations, 1 landmark, building
aliases, and 15 class sections across 2 terms. Every name is invented. The
coordinates sit in Golden Gate Park, San Francisco, purely because that area
has rich OSM basemap detail, so the seeded map looks sensible immediately.

```sh
# point DATABASE_URL at an empty Postgres (any provider), apply the schema:
bun run scripts/apply-migrations.ts
# then seed:
bun run seed:sample
```

The seed is an **upsert** — rerunning it is a no-op. It refuses to run when
the database already contains buildings that are not part of the sample (that
looks like a real campus dataset); pass `--force` only if you really mean it.
`--dry-run` validates the dataset and prints the plan without touching any DB.

Point the map at the sample campus in `src/campus.config.ts`:

```ts
export const campusMap = {
  maxBounds: [
    [-122.52, 37.75],
    [-122.42, 37.79],
  ],
  defaultCamera: {
    center: [-122.4665, 37.7702],
    zoom: 15.5,
    pitch: 0,
    bearing: 0,
  },
};
```

Then verify:

```sh
bun dev   # http://localhost:4321
```

You should see building pins around the park's Music Concourse, search that
understands aliases ("The Gym" finds Fern Gymnasium), room pages with class
schedules, and a term selector with two terms. That is the whole engine
running — everything left is swapping the data.

## 2. Replace the sample with your campus

**Buildings, rooms, orgs, places:** the in-app editor (`/?editor=login`) is
the day-to-day tool. For a first bulk load, copy `data/sample-campus/campus.json`
to your own file, replace its entries, and adapt `scripts/seed-sample-campus.ts`
(or just edit the sample JSON in your fork — it is your campus now).

**Terms:** rows in the `terms` table. `id` is any positive integer scheme you
like (UPLB mirrors its registrar's ids; the sample uses 101/102) — pick one
and keep it stable, because every class row carries a `term_id`.

**Classes** come in each term via the generic importer.

## 3. The generic class importer

```sh
bun run import:classes-generic -- path/to/classes.csv
bun run import:classes-generic -- path/to/classes.json --dry-run
```

Take whatever your registrar gives you (spreadsheet export, portal scrape,
retyped PDF) and flatten it to one row per meeting slot:

| Column | Required | Example | Notes |
| --- | --- | --- | --- |
| `course_code` | yes | `BIO 101` | |
| `section` | yes | `A-1` | |
| `type` | yes | `LEC` | `LEC`/`LECTURE` or `LAB`/`LABORATORY` |
| `days` | yes | `TTh` | Combination of `M T W Th F S` |
| `start` | yes | `10:30AM` | 12-hour (`10:30AM`) or 24-hour (`10:30`) |
| `end` | yes | `12:00PM` | Must be after `start` |
| `room_code` | yes (may be blank) | `BSC 1` | Matched against `rooms.room_code` + room aliases (fuzzy: spacing, punctuation, `RM`→`ROOM`, …) |
| `building_code` | no | `BSC` | Extra match candidate `"<building_code> <room_code>"` for registrars with per-building room numbers |
| `term_id` | yes | `101` | Must already exist in the `terms` table |
| `course_title` | no | `General Biology` | |
| `acad_group` | no | `CAS` | Registrar college code; powers the probable-location hint for roomless sections (#846) |
| `acad_org` | no | `LBICS` | Registrar department code; decoded via `data/acad-orgs.json`. Blank = keep any existing DB value |

JSON is the same shape: an array of flat objects with those keys.

Worked example (the same 15 sections the seed loads):
[`data/sample-campus/classes.csv`](../data/sample-campus/classes.csv).

Behavior, same as the UPLB AMIS importer (`scripts/import-amis-classes.ts`,
which stays as the UPLB-specific adapter):

- **Upsert by natural key** (term + course + section + type): rerunning the
  same file changes nothing; `--replace-term` also deletes DB rows the file no
  longer contains, for a clean per-term refresh.
- Rows sharing that key **merge into one class** with every meeting slot.
- **Unmatched rooms still import** (roomId null) and are listed in the
  summary — add the room or an alias, rerun, and they attach.
- **Validation names row numbers and fields** (`row 37: days must combine
  M, T, W, Th, F, S (got "MTWTHFSU")`) and aborts before any DB write.
- Sync keys refresh so open clients re-pull classes.

## Gotchas

- `bun run build` prerenders entity pages from the DB, so it needs
  `DATABASE_URL` even for the sample campus.
- Do not seed the sample into a database that already has real data — the
  guard exists because `DATABASE_URL` in a maintainer `.env` is often
  production.
- After any Drizzle schema change, `bun run generate:pglite-schema` keeps the
  offline cache in sync.
- Finished replacing UPLB data? `bun run fork:check` scans for leftover UPLB
  strings.
