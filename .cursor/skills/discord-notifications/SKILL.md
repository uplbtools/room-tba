---
name: discord-notifications
description: Wires and debugs Room TBA NotificationEvent delivery to uplbtools/discord-bot (proposal.submitted, proposal.reviewed, CI E2E, test inventory). Use when Discord notifications fail, NOTIFICATION_* env vars, Heroku bot deploy, or cross-repo changes with discord-bot.
---

# Discord notifications (room-tba ↔ discord-bot)

Contract: [docs/notifications.md](../../docs/notifications.md). Bot repo: `uplbtools/discord-bot` (Heroku). Handoff: [docs/e2e-discord-handoff.md](../../docs/e2e-discord-handoff.md).

## Two repos

| Repo | Role |
| --- | --- |
| **room-tba** | **Producer** — emits JSON via `NotificationAdapter` |
| **discord-bot** | **Consumer** — `POST /notifications` → Discord channels |

Always check **both** when notifications are silent.

## room-tba producer

```text
getNotificationAdapter()
  → HttpNotificationAdapter if NOTIFICATION_GATEWAY_URL + NOTIFICATION_INGRESS_SECRET set
  → NoOpNotificationAdapter otherwise (silent!)
```

| Event | Emitted from |
| --- | --- |
| `proposal.submitted` | `src/pages/api/proposals/index.ts` |
| `proposal.reviewed` | `src/pages/api/admin/proposals/[id]/approve|reject|request-changes.ts` |
| `ci.e2e.*` | GitHub Actions → `scripts/ci-notify-discord-e2e.sh` (not Astro runtime) |
| `ci.test_inventory.updated` | `.github/workflows/discord-test-inventory.yml` |

Shared helpers: `src/lib/notifications/proposal-events.ts`.

## discord-bot consumer

- Ingress: `POST https://uplbtools-discord-bot-*.herokuapp.com/notifications`
- Header: `x-notification-secret: NOTIFICATION_INGRESS_SECRET`
- Delivery: `src/notifications/delivery/discord.ts`

| Event | Channel |
| --- | --- |
| `proposal.submitted`, `proposal.reviewed` | `#contributors` (`CHANNEL_CONTRIBUTORS_ID`) |
| `ci.e2e.failed`, blocking E2E | `#development` |
| `ci.staging-smoke.failed` | `#deploys` |
| `ci.test_inventory.updated` | `#test-suite` |

## Vercel env (room-tba runtime)

Required on **Production** and **Preview (staging)** at minimum:

```sh
NOTIFICATION_GATEWAY_URL=https://uplbtools-discord-bot-5eb468fac572.herokuapp.com/notifications
NOTIFICATION_INGRESS_SECRET=<same as Heroku NOTIFICATION_INGRESS_SECRET>
```

**Pitfall:** vars can exist but be **empty strings** — app no-ops silently. `vercel env pull` often omits encrypted values; verify with a successful notify or Vercel UI.

```sh
vercel env ls | rg NOTIFICATION
vercel env add NOTIFICATION_GATEWAY_URL production --value "$GATEWAY" --yes --force
```

**Redeploy** after env fix; existing deployments do not pick up new vars.

## Heroku (discord-bot)

```sh
heroku config:get NOTIFICATION_INGRESS_SECRET -a uplbtools-discord-bot
git push heroku main   # from discord-bot checkout on main
```

## Manual verify (curl)

```sh
SECRET=$(heroku config:get NOTIFICATION_INGRESS_SECRET -a uplbtools-discord-bot)
curl -sS -X POST "https://uplbtools-discord-bot-5eb468fac572.herokuapp.com/notifications" \
  -H "Content-Type: application/json" \
  -H "x-notification-secret: $SECRET" \
  -d '{"schemaVersion":1,"type":"proposal.reviewed","source":"room-tba","occurredAt":"'$(date -Iseconds)'","idempotencyKey":"test:manual","payload":{"proposalId":1,"outcome":"approved","entityType":"room","entityId":1,"entityLabel":"Test","submitterName":"Test","reviewedBy":"Editor","adminNote":null}}'
```

Expect `{"ok":true}` and embed in `#contributors`.

## Ship order (new event type)

1. Add type + Zod schema in **both** repos.
2. Bot handler + deploy Heroku.
3. room-tba emitter + Vercel env check.
4. Manual curl, then end-to-end on staging/prod.

## Paired issues

- room-tba [#222](https://github.com/uplbtools/room-tba/issues/222) — proposal reviewed
- discord-bot [#4](https://github.com/uplbtools/discord-bot/issues/4) — bot embed handler

Comment on both issues when shipping cross-repo work.
