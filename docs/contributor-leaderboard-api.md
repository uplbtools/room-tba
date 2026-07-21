# Contributor leaderboard API

Discord `/leaderboard` and other bots consume this read-only endpoint. **Scoring lives in room-tba**: bots must not re-aggregate.

## `GET /api/contributors/leaderboard`

| Query | Values | Default |
| --- | --- | --- |
| `window` | `month`, `semester`, `all` | `month` |

### Example response

```json
{
  "window": "month",
  "rows": [
    {
      "rank": 1,
      "displayName": "Yeyel",
      "contributionCount": 4,
      "lastContributionAt": "2026-07-03T14:22:00.000Z"
    }
  ]
}
```

## Ledger writes

A row is appended when signed-in work is published: an approved proposal uses
`contributions.source = proposal_approved`, while a direct editor publish uses
`editor_published`. Anonymous proposals are unchanged.

Users who turn off **Show my contributions in public credits** are excluded
from the public leaderboard. Their own signed-in account can still read its
ledger at `GET /api/contributions/mine`.

## Migration

Apply before deploy: `drizzle/0018_contributions_ledger.sql`

## Public editor credits

`GET /api/editor-credits` returns only a public name, optional avatar URL, and optional profile URL. A person appears after editor activity or an approved signed-in contribution; the two historical legacy credits remain visible. Active users are opted in by default and can opt out in Account settings. Avatar and profile URLs are optional HTTPS URLs only; emails, roles, usernames, and account IDs are never returned.

Apply `drizzle/0036_editor_credits_profiles.sql` before deploying this endpoint. It is additive and idempotently seeds the two inactive, passwordless historical records.
