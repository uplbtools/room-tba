# NotificationEvent contract

Shared with [uplbtools/discord-bot](https://github.com/uplbtools/discord-bot). See `src/lib/notifications/types.ts`.

Producers emit versioned JSON; the Discord bot routes to channels. Room TBA uses `NotificationAdapter` — `HttpNotificationAdapter` when `NOTIFICATION_GATEWAY_URL` + `NOTIFICATION_INGRESS_SECRET` are set, else `NoOpNotificationAdapter`.

## proposal.submitted

Emitted fire-and-forget after successful `POST /api/proposals`.

## Leaderboard API (future)

Discord-only leaderboard UX. Room TBA will expose `GET /api/contributors/leaderboard?window=month|semester|all`. See GitHub issue under #220.
