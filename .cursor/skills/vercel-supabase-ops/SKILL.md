---
name: vercel-supabase-ops
description: Operates Room TBA Vercel deploys and Supabase Postgres (DATABASE_URL, env vars, preview/production, migrations). Use when builds fail on Vercel, missing DATABASE_URL, env pull empty strings, staging preview, or applying drizzle migrations before deploy.
---

# Vercel + Supabase ops

Canonical reference: [AGENTS.md § Vercel CLI and environment ops](../../AGENTS.md#vercel-cli-and-environment-ops). Human setup: [docs/developer-guide.md](../../docs/developer-guide.md).

## Project

- Vercel: `stimmie/saan-ang-room` (`.vercel/project.json`)
- Production: `room-tba.uplbtools.me` ← **`main` only**
- Staging preview: `staging.room-tba.uplbtools.me` ← **`staging` branch**
- GitHub org: `uplbtools/room-tba`

Use **`gh`** and **`vercel`** CLI by default; do not send maintainers to dashboards when CLI works.

## Required env vars

| Var | Where | Notes |
| --- | --- | --- |
| `DATABASE_URL` | Production + all Preview | **Mandatory** for `bun run build` (SSG prerender) |
| `NOTIFICATION_GATEWAY_URL` | Production + Preview staging | See [discord-notifications](../discord-notifications/SKILL.md) |
| `NOTIFICATION_INGRESS_SECRET` | Production + Preview staging | Same |
| `ADMIN_PASSWORD` | Dev/local | Editor login |
| `ISR_BYPASS_TOKEN` | Vercel | On-demand SEO revalidation after publish |

Runtime code uses **`DATABASE_URL` only** (not `NEON_CONNECTION_STRING`).

## Common pitfalls

| Symptom | Fix |
| --- | --- |
| `vercel env pull` shows `DATABASE_URL=""` | Encrypted omit; copy from Supabase/Vercel UI |
| Var listed but build fails missing DATABASE_URL | Value may be empty string; re-add with `--force` |
| Preview branch build fails | `DATABASE_URL` must exist for **all** preview targets, not only `staging` |
| Prod deploy from wrong branch | `check-production-branch.sh` blocks non-`main` on production builds |

## CLI cheat sheet

```sh
vercel whoami
vercel env ls
vercel env add DATABASE_URL preview staging --value "$DATABASE_URL" --yes --force
vercel env pull .env.vercel --environment=preview --yes
vercel ls
vercel redeploy <latest-production-deployment-url>
gh pr checks <n> --repo uplbtools/room-tba
```

**Never** `vercel deploy --prod` except from `main` matching `origin/main`. Ship prod via **`staging → main`** release PR.

## Supabase migrations

- SQL in `drizzle/`; apply **before** deploy that depends on new columns.
- Apply: `psql "$DATABASE_URL" -f drizzle/NNNN_name.sql` or Supabase SQL editor.
- Local check: `bun run check:migrations` (CI uses E2E DB).

## Local dev

```sh
# Prefer session pooler (*.pooler.supabase.com)
cp .env.example .env.local
vercel env pull .env.vercel --environment=development --yes
# Merge DATABASE_URL into .env.local
bun dev
```

PGlite in browser is **offline cache only**, not a server DB fallback.

## Build guards

- `scripts/check-vercel-env.sh` — fails missing `DATABASE_URL`
- `scripts/check-production-branch.sh` — prod builds only on `main`

```sh
bun run check:vercel-env
bun run check:prod-branch   # set VERCEL_ENV=production to test branch guard
bun run build               # local pre-merge gate
```

## Branch → deploy

| Branch | Target |
| --- | --- |
| `main` | Production |
| `staging` | Staging preview |
| feature | Ephemeral preview |

After env fix on Vercel: **redeploy**; failed deploys are not auto-retried.
