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
