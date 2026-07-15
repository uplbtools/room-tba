# Contributor leaderboard API

Discord `/leaderboard` and other bots consume this read-only endpoint. **Scoring lives in room-tba**: bots must not re-aggregate.

## `GET /api/contributors/leaderboard`

| Query | Values | Default |
| --- | --- | --- |
| `window` | `month`, `semester`, `all` | `month` |

Optional header: `Authorization: Bearer <ROOM_TBA_BOT_API_KEY>` when `ROOM_TBA_BOT_API_KEY` is set on the server.

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

A row is appended when a **signed-in** contributor's proposal is **approved** (`contributions.source = proposal_approved`). Anonymous proposals are unchanged.

## Migration

Apply before deploy: `drizzle/0018_contributions_ledger.sql`

## Public editor credits

`GET /api/editor-credits` returns only a public name, optional avatar URL, and optional profile URL. A person appears after editor activity or an approved signed-in contribution; the two historical legacy credits remain visible. Active users are opted in by default and can opt out in Account settings. Avatar and profile URLs are optional HTTPS URLs only; emails, roles, usernames, and account IDs are never returned.

Apply `drizzle/0036_editor_credits_profiles.sql` before deploying this endpoint. It is additive and idempotently seeds the two inactive, passwordless historical records.
