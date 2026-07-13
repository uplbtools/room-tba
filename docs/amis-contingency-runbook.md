# AMIS access contingency runbook

Parent: [#318](https://github.com/uplbtools/room-tba/issues/318). COM refresh happy path: [amis-com-refresh-runbook.md](./amis-com-refresh-runbook.md).

Runtime app reads **Supabase `classes` + PGlite cache**, not live AMIS. Live AMIS is an **update channel** for maintainers only.

## Publish schedules without live AMIS

1. Use the last sanitized export: `data/amis-*-{termId}.json` (gitignored), maintainer vault, or R2 backup.
2. Import to Supabase (bumps `classes` sync key + `terms.classes_imported_at`):

```sh
DATABASE_URL=… bun run import:amis-classes -- --term-id 1252 --from-json data/amis-classes-1252.json
```

3. Remove stale sections after COM when needed:

```sh
DATABASE_URL=… bun run import:amis-classes -- --term-id 1252 --from-json data/amis-classes-1252.json --replace-term
```

4. Verify: app refetches classes on next online visit; term picker shows import date / stale note when old.

## Failure modes

| Scenario | Import exit | Operator action | Users see |
| --- | --- | --- | --- |
| Token expired / 401 | `10 AUTH_EXPIRED` | Fresh bearer from AMIS DevTools; `--fetch` once, or `--from-json` | Last import; stale banner if old |
| Blocked / 403 | `11 FORBIDDEN` | Stop `--fetch`; use cached JSON → Supabase | Same |
| Rate limit / 429 | `12 RATE_LIMIT` | Wait; retry `--fetch`; prefer cache meanwhile | Same |
| Schema / empty parse | `13 SCHEMA_MISMATCH` | Fix parser or manual export → `--from-json` | Same |
| AMIS 5xx / outage | `14 AMIS_UNAVAILABLE` | `--from-json` only | Same |
| No local JSON | `4 MISSING_EXPORT` | Prior `--fetch` while token valid, or obtain export from vault | Same |

Script prints an operator hint and exits with the code above. `echo $?` after failure.

## Manual JSON path

When AMIS UI allows export (or a maintainer saved JSON):

1. Sanitize: no instructor names in committed files.
2. Place at `data/amis-classes-{termId}.json` or pass `--from-json /path/to/file.json`.
3. Run import (with `--dry-run` first if unsure).

See [#286](https://github.com/uplbtools/room-tba/issues/286) / [#287](https://github.com/uplbtools/room-tba/issues/287).

## Durable last-known-good (ops)

- Keep sanitized JSON per term outside git (R2, encrypted maintainer vault).
- Never commit `data/amis-*.json` or bearer tokens.
- After prod import, note `terms.classes_imported_at` in Supabase.

## App behavior when AMIS is unavailable

- Browse/search/class panels **do not call AMIS**.
- Failed maintainer fetch does not blank schedules.
- Stale imports show a notice in the term picker / class list (see `classesScheduleFreshnessMessage`).
- Wrong schedule reports: [#308](https://github.com/uplbtools/room-tba/issues/308).

## Non-goals (v1)

- Automated AMIS login or browser polling.
- Scraping SAIS without permission.
- Real-time AMIS from production app code.
