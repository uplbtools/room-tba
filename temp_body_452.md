Parent: #451

**Status:** proposed  
**Last verified against staging:** 2026-07-12

## Problem

Production and staging lack structured error and performance visibility. Volunteer reports like “side panel went blank” or silent API 500s are hard to debug from Vercel logs alone.

## Goal

Claim the GitHub Student Pack **Sentry** offer and wire Room TBA (Astro 7 SSR + Svelte islands) so server and client errors reach Sentry with environment, release, and usable stack traces.

## Implementation pointers

- Official `@sentry/astro` (or current Sentry Astro SDK) in `astro.config.mjs`
- Separate environments: Vercel Preview (`staging` branch) vs Production (`main`)
- Source maps on Vercel build — Sentry Vercel integration or `sentry-cli` upload step
- Tag releases with `VERCEL_GIT_COMMIT_SHA`
- Optional session replay on browse flows — low sample rate
- **PII:** scrub or disable breadcrumbs on `/api/admin/*`, auth, and proposal bodies
- Env: `SENTRY_DSN`, `SENTRY_AUTH_TOKEN` (uploads) — Vercel + document in `.env.example`

## Acceptance criteria

- [ ] Student Pack Sentry offer claimed; project under UPLB Tools org
- [ ] Staging + production DSNs set in Vercel env
- [ ] Server and client errors appear in Sentry with correct `environment` and `release`
- [ ] Production stack traces resolve via uploaded source maps
- [ ] PII scrubbing documented; admin routes excluded or redacted
- [ ] Maintainer triage notes in `docs/developer-guide.md` or new `docs/observability.md`

## Tests (required in implementation PR)

- [ ] Unit: Sentry init no-ops when DSN absent (local dev without Sentry unchanged)
- [ ] Manual: trigger a one-off test error on staging preview; confirm in Sentry; remove test hook

## Non-goals

- Honeybadger / New Relic / second APM
- Sending AMIS or instructor data to Sentry