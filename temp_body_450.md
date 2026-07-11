Parent: #220

**Status:** proposed  
**Last verified against staging:** 2026-07-12

## Problem

Campus volunteers need signed-in identity and a durable record of accepted work. The **leaderboard is Discord-only** — room-tba must expose data, not build ranking UI.

## Depends on

- #225 — contributor sign-up
- #310 — public profiles (display names on API rows)

## room-tba delivers (backend + docs)

1. **Contributor accounts** — link/fold into #225; proposals/edits attributable to `user_id` when signed in
2. **Contribution ledger** — append-only Postgres rows on **accepted/published** work (proposal approve, editor publish)
3. **Read API for discord-bot** — document in `docs/contributor-leaderboard-api.md`:
   - `GET /api/contributors/leaderboard?window=month|semester|all` → `{ rank, displayName, slug?, contributionCount, lastContributionAt }[]`
   - Optional `Authorization: Bearer <ROOM_TBA_BOT_API_KEY>`
   - Profile opt-out excludes user from public leaderboard response
4. **My contributions** — signed-in ledger browser OK; **no** in-app campus-wide ranked page

## Discord consumer (uplbtools/discord-bot)

| Consumer | Behavior |
| --- | --- |
| `/leaderboard` | Fetch API → calm embed (top N, window option) |
| Weekly cron | Optional digest to `#contributors` |
| Scoring | **Single source of truth in room-tba** — bot must not re-aggregate |

Bot repo: https://github.com/uplbtools/discord-bot — `/leaderboard` ships with graceful fallback until this API lands.

Env on bot: `ROOM_TBA_LEADERBOARD_API_URL`, optional `ROOM_TBA_BOT_API_KEY`.

## Acceptance criteria

- [ ] Ledger rows written atomically on proposal approve / edit publish
- [ ] Anonymous submissions unchanged; ledger attaches when account exists
- [ ] Leaderboard API returns stable ranked JSON; example response in docs
- [ ] Profile opt-out excludes user from public leaderboard API
- [ ] Unit/integration tests for ledger writes and API

## Non-goals

- In-app campus leaderboard UI, badges, karma
- Discord bot implementation (discord-bot repo)
- Reputation gating edit rights

## Related

- #225, #310, #308, #222
- discord-bot NotificationAdapter: room-tba PR for `proposal.submitted`