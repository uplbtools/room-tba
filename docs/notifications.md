# NotificationEvent contract

Shared with [uplbtools/discord-bot](https://github.com/uplbtools/discord-bot). See `src/lib/notifications/types.ts`.

Producers emit versioned JSON; the Discord bot routes to channels. Room TBA uses `NotificationAdapter` — `HttpNotificationAdapter` when `NOTIFICATION_GATEWAY_URL` + `NOTIFICATION_INGRESS_SECRET` are set, else `NoOpNotificationAdapter`.

## CI E2E failures (GitHub Actions)

Playwright workflow failures POST from `.github/workflows/discord-notify-e2e.yml` via `scripts/ci-notify-discord-e2e.sh` (not the Astro app).

Event types: `ci.e2e.failed`, `ci.e2e.advisory.failed`, `ci.staging-e2e.failed`, `ci.staging-smoke.failed`, optional `ci.e2e.passed`.

Secrets: `NOTIFICATION_GATEWAY_URL`, `NOTIFICATION_INGRESS_SECRET` (same as proposal notifications).

See [docs/e2e-discord-handoff.md](e2e-discord-handoff.md).

## proposal.submitted

Emitted fire-and-forget after successful `POST /api/proposals`.

## proposal.reviewed

Emitted fire-and-forget after successful admin review:

- `POST /api/admin/proposals/[id]/approve` → `outcome: approved`
- `POST /api/admin/proposals/[id]/reject` → `outcome: rejected`
- `POST /api/admin/proposals/[id]/request-changes` → `outcome: needs_changes`

Not emitted when approve fails with `409` (publish conflict — proposal stays pending).

Payload: `proposalId`, `outcome`, `entityType`, `entityId`, `entityLabel`, `submitterName`, `reviewedBy`, `adminNote`.

Discord bot posts to `#contributors` (see discord-bot repo).

## Leaderboard API (future)

Discord-only leaderboard UX. Room TBA will expose `GET /api/contributors/leaderboard?window=month|semester|all`. See GitHub issue under #220.
