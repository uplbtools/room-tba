**Status:** proposed  
**Last verified against staging:** 2026-07-12

## Problem

Room TBA runs on Vercel with Playwright E2E in GitHub Actions, but production/staging lacks structured **error and performance visibility**, and CI only exercises Chromium — not real iOS Safari / device quirks that matter for map chrome at **320px / 768px** and PWA install flows.

The [GitHub Student Developer Pack](https://education.github.com/pack) includes offers worth claiming for this project:

| Partner | Pack benefit (verify in portal) | Room TBA fit |
| --- | --- | --- |
| **Sentry** | Error + performance monitoring | SSR/API failures, client `pageerror`, session replay for “blank panel” reports |
| **BrowserStack** | ~1 year cross-browser / real devices | Supplement Playwright for manual/advisory QA and optional CI matrix |
| **LambdaTest** | ~1 year cross-browser cloud | Same category as BrowserStack — **pick one primary cloud** after evaluation |

This epic tracks claiming accounts, wiring integrations, and documenting maintainer runbooks. Split into sub-issues if implementation PRs land separately.

## Scope (three tracks)

### 1. Sentry (APM / error tracking)

**Goal:** Catch server and client errors on staging + production with enough context to debug without reproducing on a volunteer’s phone.

**Implementation pointers**

- Astro 7 SSR + Svelte islands — use official `@sentry/astro` (or equivalent) with separate DSNs or environments for `staging` vs `production`
- Wire into `astro.config.mjs`; avoid double-init on client islands
- Source maps upload on Vercel build (Sentry Vercel integration or `sentry-cli` in build step)
- Tag releases with git SHA (`VERCEL_GIT_COMMIT_SHA`) for regression correlation
- Optional: session replay on browse flows (map bootstrap, side panel open) — sample rate low to control quota
- Do **not** send PII (admin emails, proposal text bodies) — scrub or disable breadcrumbs on `/api/admin/*` and auth routes
- Secrets: `SENTRY_DSN` (per env), `SENTRY_AUTH_TOKEN` for uploads — Vercel env + GitHub Actions if needed

**Docs:** `docs/developer-guide.md`, `.env.example` comments, AGENTS.md verify section (when to check Sentry vs logs)

### 2. BrowserStack (cross-browser QA)

**Goal:** Real-device and browser coverage beyond Playwright Chromium — especially iOS Safari, Android Chrome, narrow viewports.

**Implementation pointers**

- Claim Student Pack offer; store credentials in maintainer 1Password (see pack partners list)
- **Phase A — manual/advisory:** document smoke checklist in `docs/testing.md` § Manual only (map load, search, side panel, PWA add-to-home)
- **Phase B — optional CI:** BrowserStack Automate or Playwright connect for advisory workflow (non-blocking, like `e2e-advisory.yml`) — do not block PR merges on cloud quota
- Map critical paths from existing specs: `e2e/browse/search-flow.spec.ts`, `e2e/smoke/boot.spec.ts`, side panel parity

### 3. LambdaTest (cross-browser QA — evaluate vs BrowserStack)

**Goal:** Same as BrowserStack. Student Pack includes both; **standardize on one cloud** to avoid duplicate secrets, docs, and CI jobs.

**Implementation pointers**

- Claim offer if not already using BrowserStack exclusively
- Run same manual smoke matrix on LambdaTest HyperExecute or Playwright grid
- Document decision in issue comment: “BrowserStack primary” or “LambdaTest primary” with rationale (device list, Playwright support, quota)
- Defer second cloud to backlog or close as duplicate once primary is chosen

## Acceptance criteria

### Sentry
- [ ] Student Pack Sentry offer claimed; org/project created for `uplbtools/room-tba`
- [ ] Staging + production DSNs configured in Vercel (Preview `staging` branch + Production `main`)
- [ ] Server and client errors from map app appear in Sentry with environment + release tags
- [ ] Source maps resolve stack traces for production builds
- [ ] PII scrubbing documented; admin routes excluded or redacted
- [ ] `docs/developer-guide.md` (or `docs/observability.md`) explains triage workflow for maintainers

### Cross-browser (BrowserStack **or** LambdaTest — not both required long-term)
- [ ] Student Pack offer claimed for chosen primary vendor
- [ ] Manual QA matrix documented for map chrome 320px / 768px and PWA on at least one real mobile browser
- [ ] Credentials stored in team secret manager (not committed)
- [ ] Optional: advisory GitHub Actions job runs a minimal smoke subset on cloud browsers (non-blocking)
- [ ] Issue comment records which vendor was selected and why the other was deferred

### Repo hygiene
- [ ] `.env.example` lists optional `SENTRY_*` vars with “Student Pack” note
- [ ] No secrets in repo, issues, or PR bodies
- [ ] README or `docs/testing.md` mentions cross-browser supplement to Playwright (not a replacement)

## Tests (required in implementation PR)

- [ ] Unit: Sentry init guarded when DSN absent (local dev without Sentry still works)
- [ ] Integration: optional — test route or script that verifies Sentry SDK no-ops without env
- [ ] E2E blocking: unchanged — Playwright local/CI remains primary gate
- [ ] Manual only: BrowserStack/LambdaTest smoke on staging after deploy; Sentry verify via thrown test error in staging preview (then remove test hook)

## Non-goals

- Replacing Vercel logs or GitHub Actions CI with a third APM (Honeybadger, New Relic) — Sentry only unless blocked
- Running both BrowserStack and LambdaTest in CI permanently
- Sending AMIS/instructor data or raw proposal content to Sentry

## Sub-issues

- #452 — Sentry (staging + production)
- #453 — BrowserStack manual smoke matrix
- #454 — LambdaTest evaluation + vendor decision

## Related

- Playwright pyramid: `docs/testing.md`
- Discord bot / Heroku already uses Student Pack Heroku credits (separate repo)
- Cloudflare edge caching: #441 (orthogonal CDN work)