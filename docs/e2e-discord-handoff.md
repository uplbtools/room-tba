# E2E → Discord integration handoff

**Audience:** agent wiring [uplbtools/discord-bot](https://github.com/uplbtools/discord-bot) to Room TBA Playwright CI.  
**App repo:** `uplbtools/room-tba`  
**Branch status (2026-07-03):** workflow gating + `e2e-reusable.yml` live on **`feat/testing-pyramid`** (13 commits ahead of origin); **not merged to `staging`/`main` yet**. `ci-notify-discord.yml` **does not exist** in room-tba — treat as planned/discord-bot-side draft only.

---

## 1. Workflow map

### Playwright workflows

| Workflow file | `name:` (workflow_run filter) | Caller job id | Reusable job id | Trigger | Blocking? | Integration before PW? | ~Wall clock |
|---------------|--------------------------------|---------------|-----------------|---------|-----------|------------------------|-------------|
| `.github/workflows/e2e.yml` | **`E2E`** | `e2e` | `e2e` (in `E2E (reusable)`) | PR `opened` (non-draft), `ready_for_review`, `reopened`, label **`run/e2e`** | **Yes** | **Yes** (same job) | ~28–35 min |
| `.github/workflows/e2e-advisory.yml` | **`E2E advisory`** | `e2e-advisory` | `e2e` | Same PR gates as `E2E` | No (`continue-on-error: true`) | No | ~15–20 min |
| `.github/workflows/e2e-staging.yml` | **`E2E staging`** | `e2e` | `e2e` | Push to **`staging`**; cron **`0 18 * * *`** (02:00 Asia/Manila) | **Yes** | **Yes** | ~28–35 min |
| `.github/workflows/staging-smoke.yml` | **`Staging smoke`** | `staging-smoke` | — | Push to **`staging`** only | No | No | ~2–4 min |

**Draft PR pushes:** E2E workflows **do not run**. Only `CI` verify + migrations run (~6–9 min).

**Related (no Playwright):** `.github/workflows/bundle-advisory.yml` (`Bundle advisory`) — gated like E2E, non-blocking, prod build + JS budget (~5 min).

### Reusable job step order (`.github/workflows/e2e-reusable.yml`, job `e2e`)

**Blocking suite (`suite: blocking`):**

1. `Reset E2E database` → `bun run e2e:reset-db`
2. `Build for E2E preview` → `bun run build:e2e`
3. `Start preview server` → background `bun run preview:e2e`
4. **`Integration tests`** → `PREVIEW_BASE_URL=http://127.0.0.1:4321 bun run test:integration`
5. **`Playwright blocking tests`** → `PLAYWRIGHT_SKIP_WEBSERVER=1 bun run e2e`

**Advisory suite (`suite: advisory`):** steps 1–2, then `Playwright advisory tests` → `bun run e2e:advisory` (starts own preview via `serve:e2e` in config).

### `workflow_run` filter examples

```yaml
on:
  workflow_run:
    workflows: ["E2E", "E2E advisory", "E2E staging", "Staging smoke"]
    types: [completed]
```

Job-level filter inside reusable callers is not visible to `workflow_run` — use **workflow `name:`** only.

---

## 2. Test inventory

### Blocking (`playwright.config.ts`)

- **testDir:** `e2e`
- **testIgnore:** `**/staging/**`, `**/advisory/**`
- **Projects:** `desktop-chrome`, `mobile-chrome` (skips `@desktop-only` on mobile)
- **Workers:** 2 (CI)
- **Timeout:** 90s
- **Retries:** 1 in CI
- **Trace:** `on-first-retry`; **screenshot:** `only-on-failure`
- **Count:** **112 tests** (local `--list`, Jul 2026)

#### Smoke — `e2e/smoke/` (blocking)

| File | Purpose |
|------|---------|
| `boot.spec.ts` | App boot, no pageerror, viewport meta |
| `entity-pages.spec.ts` | SEO entity pages render |
| `redirects.spec.ts` | `/admin` → in-app login |
| `term-classes.spec.ts` | Term selector + class browse |

#### Browse — `e2e/browse/` (blocking)

| File | Purpose |
|------|---------|
| `building-filters.spec.ts` | Pin filter chips aria-pressed |
| `campus-browse-chips.spec.ts` | Browse buildings/colleges/divisions/classes |
| `campus-events.spec.ts` | Events browse panel |
| `entity-seo.spec.ts` | Room/building/event SEO pages |
| `final-exams.spec.ts` | Finals panel |
| `map-tools.spec.ts` | Map menu / terrain / layers |
| `search-collapse.spec.ts` | Search + map menu mobile (`@mobile`) |
| `search-flow.spec.ts` | Search → side panel |
| `side-panel.spec.ts` | Panel layout desktop + mobile overflow |

#### Admin — `e2e/admin/` (blocking)

| File | Purpose |
|------|---------|
| `auth.spec.ts` | Login modal, bad password, disabled user |
| `building-3d.spec.ts` | 3D viewer edit control visibility |
| `building-edit.spec.ts` | Building directions PATCH |
| `college-division-edit.spec.ts` | College/division panels |
| `conflicts.spec.ts` | Stale save 409 UI |
| `dorm-edit.spec.ts` | Dorm directions PATCH |
| `event-edit.spec.ts` | Event description edit |
| `history.spec.ts` | `editor_history` row after save |
| `map-edit.spec.ts` | Pin drag PATCH (conditional skip if drag fails) |
| `multi-user.spec.ts` | Admin + contributor sessions |
| `proposals.spec.ts` | Contributor suggest edit; admin queue **skipped** |
| `room-edit.spec.ts` | Room fields PATCH |
| `undo-redo.spec.ts` | Undo/redo after pin drag (conditional skip) |

**Intentionally skipped in blocking suite:**

- `proposals.spec.ts` — admin review queue (`test.skip(true, …)`)
- `map-edit.spec.ts` / `undo-redo.spec.ts` — skip when pin drag doesn’t PATCH (flake guard)
- Some `@mobile` tests skip on desktop project

### Advisory (`playwright.advisory.config.ts`)

- **testDir:** `e2e/advisory`
- **Projects:** `desktop-chrome`, `mobile-chrome`, **`webkit`**
- **Timeout:** 60s; **retries:** 0
- **Count:** **45 tests**

| File | Purpose |
|------|---------|
| `a11y.spec.ts` | axe on boot + room panel |
| `building-3d-autosave.spec.ts` | 3D autosave advisory |
| `cross-browser.spec.ts` | WebKit-only smoke |
| `keyboard-nav.spec.ts` | Keyboard navigation |
| `layout-chrome.spec.ts` | Map chrome layout |
| `map-attribution.spec.ts` | MapLibre attribution |
| `mobile-touch-drag.spec.ts` | Touch drag mobile |
| `offline-boot.spec.ts` | Offline bootstrap |
| `offline-pwa.spec.ts` | PWA installability hints |
| `schedule-import.spec.ts` | Schedule import UI |
| `transit-jeepney.spec.ts` | Jeepney layer |

### Staging live URL (`playwright.staging.config.ts`)

- **testDir:** `e2e/staging`
- **baseURL:** `STAGING_BASE_URL` → `https://staging.room-tba.uplbtools.me`
- **No webServer** (hits deployed staging)
- **Count:** **6 tests** (1 skipped)

| File | Purpose |
|------|---------|
| `live-boot.spec.ts` | Homepage + `/admin` redirect on live staging |
| `live-browse.spec.ts` | Map tools flyout on live staging |
| `data-fidelity.spec.ts` | Search + term selector; one test **skipped** pending seed |

### New specs on `feat/testing-pyramid` (not on staging)

No brand-new spec **files** beyond the pyramid layout above; work is mostly **helpers** (`e2e/helpers/*.ts`), seed (`scripts/e2e-reset-db.ts`), and CI wiring. Uncommitted WIP may exist locally — re-run `bun run e2e -- --list` before shipping Discord copy that cites test counts.

---

## 3. Failure artifacts

### On failure (`if: failure()` in `e2e-reusable.yml`)

| Item | Detail |
|------|--------|
| **Artifact name** | `playwright-report-{suite}-{github.run_id}` — e.g. `playwright-report-blocking-123456789` |
| **Path uploaded** | `playwright-report/` (Playwright HTML report only) |
| **Traces** | Written under `test-results/` on retry — **not uploaded** (gitignored) |
| **Screenshots** | Embedded in HTML report when step fails (`only-on-failure`) |
| **Staging smoke** | **No artifact upload today** — failure is log-only |

### Maintainer links

- **Workflow run:** `https://github.com/uplbtools/room-tba/actions/runs/{run_id}`
- **Artifact download:** Actions run → Artifacts → `playwright-report-*` (zip with `index.html`)
- **Trace viewer:** not available from CI unless you add `test-results/` artifact upload or blob report

### Exit codes / first failing step (blocking job)

| Order | Step | Typical failure |
|-------|------|-----------------|
| 1 | Reset E2E database | Supabase/env/seed script |
| 2 | Build for E2E preview | `DATABASE_URL`, Astro build |
| 3 | Start preview server | Health check timeout (120s) |
| 4 | **Integration tests** | `bun test integration` exit 1 — **Playwright never runs** |
| 5 | Playwright blocking tests | Playwright exit 1 |

Advisory job: Playwright step only (after reset + build); integration skipped.

---

## 4. Recommended Discord notifications

**Principles:** draft PRs silent; blocking failures loud in `#development`; advisory/staging-smoke softer; avoid pass spam; recovery optional.

| Event | Channel | Blocking? | Notify? | Example message |
|-------|---------|-----------|---------|-----------------|
| **E2E** (`E2E`) failed on PR | `#development` (`1522346697282425082`) | Yes | **Yes** | `❌ Room TBA E2E failed on PR #447 (feat/testing-pyramid) — integration step` / `Playwright step` + link to Actions run |
| **E2E advisory** failed on PR | `#development` | No | **Yes, one line** | `⚠️ E2E advisory failed (non-blocking) on PR #447 — {run_url}` |
| **E2E staging** failed on **push** to staging | `#development` | Yes | **Yes** | `❌ Staging E2E failed after merge to staging @ {short_sha}` |
| **E2E staging** failed **nightly** cron | `#development` | Yes | **Digest-style** | `🌙 Nightly staging E2E failed on staging @ {short_sha}` — suppress if same `{sha}` already notified in last 24h |
| **Staging smoke** failed | `#deploys` | No | **Yes** | `⚠️ Staging smoke failed (live URL) — staging.room-tba.uplbtools.me` |
| **Bundle advisory** failed | `#development` | No | Optional / muted | Only if you want bundle noise; recommend **silent** or weekly digest |
| E2E passed after prior failure on same PR | `#development` | — | **Optional** | `✅ E2E recovered on PR #447` — only if bot tracks last conclusion per PR |
| Draft PR | — | — | **Silent** | Workflows don’t run |

**Digest vs per-run:** per-run for **blocking** PR + staging push failures; **dedupe nightly** staging E2E against recent push failure (same SHA); advisory **per-run but single-line** (no `@everyone`).

**#contributors:** no E2E failure posts — keep for human-facing contribution wins (`release.published`, etc.).

---

## 5. Integration approach (recommended)

### **Hybrid A + B**

| Piece | Role |
|-------|------|
| **A. `workflow_run` → POST `/notifications`** | Primary: one workflow `discord-notify-e2e.yml` listens for completed Playwright workflows; maps conclusion → event type; stable idempotency |
| **B. Optional failure step in `e2e-reusable.yml`** | Enrich payload with failed spec list via JSON reporter (see below) — only when `failure()` |

**Do not use** raw Discord webhook (draft `ci-notify-discord.yml`) — bypasses bot routing, idempotency, and channel policy.

**Do not rely on D alone** (`/ci` only) — E2E is gated; maintainers won’t run `/ci` for nightly/staging failures.

**Room TBA `NotificationAdapter`:** use for **in-app producers** (proposals, future deploy hooks). **CI should POST directly from GitHub Actions** — Astro app isn’t running during test jobs.

### New event types (extend `src/lib/notifications/types.ts` + bot)

```ts
| "ci.e2e.failed"
| "ci.e2e.passed"           // optional recovery
| "ci.e2e.advisory.failed"
| "ci.staging-e2e.failed"
| "ci.staging-smoke.failed"
```

### JSON payload shape (POST body)

Uses existing envelope (`schemaVersion: 1`, `source: "github"`):

```json
{
  "schemaVersion": 1,
  "type": "ci.e2e.failed",
  "source": "github",
  "occurredAt": "2026-07-03T21:30:00.000Z",
  "idempotencyKey": "ci:e2e.failed:E2E:94728473342",
  "payload": {
    "repo": "uplbtools/room-tba",
    "workflow": "E2E",
    "workflowUrl": "https://github.com/uplbtools/room-tba/actions/runs/94728473342",
    "conclusion": "failure",
    "branch": "feat/testing-pyramid",
    "commitSha": "abc1234",
    "prNumber": 447,
    "prUrl": "https://github.com/uplbtools/room-tba/pull/447",
    "suite": "blocking",
    "failedStep": "Playwright blocking tests",
    "integrationRan": true,
    "integrationFailed": false,
    "failedTests": [
      "admin/auth.spec.ts › admin auth › login via modal"
    ],
    "artifactName": "playwright-report-blocking-94728473342",
    "durationSeconds": 1680,
    "trigger": "ready_for_review"
  }
}
```

**Field notes:**

- `failedStep` — parse from GitHub Actions API jobs API, or set in notify step env
- `failedTests` — requires adding JSON reporter to Playwright CI (see blocker below); omit until then
- `trigger` — `ready_for_review` \| `run/e2e` \| `push` \| `schedule` \| `opened`
- Staging/nightly: `prNumber` null, `branch` = `staging`

### GitHub secrets (room-tba)

| Secret | Required | Purpose |
|--------|----------|---------|
| `NOTIFICATION_GATEWAY_URL` | Yes | e.g. `https://uplbtools-discord-bot.herokuapp.com/notifications` |
| `NOTIFICATION_INGRESS_SECRET` | Yes | Header `x-notification-secret` (matches bot) |
| `E2E_DATABASE_URL` | Already set | Playwright jobs |
| `E2E_ADMIN_PASSWORD` | Already set | Playwright jobs |
| `E2E_ADMIN_SESSION_SECRET` | Already set | Playwright jobs |

No Discord webhook URL secret needed if using bot.

### Idempotency keys

```
ci:e2e.failed:{WorkflowName}:{run_id}
ci:e2e.passed:{WorkflowName}:{run_id}
ci:e2e.advisory.failed:E2E advisory:{run_id}
ci:staging-e2e.failed:E2E staging:{run_id}
ci:staging-smoke.failed:Staging smoke:{run_id}
```

Nightly dedupe (bot-side): also store `{workflow}:{head_sha}` and ignore duplicate failures within 24h.

### Suggested `discord-notify-e2e.yml` sketch

```yaml
name: Discord notify E2E
on:
  workflow_run:
    workflows: ["E2E", "E2E advisory", "E2E staging", "Staging smoke"]
    types: [completed]
jobs:
  notify:
    if: >
      github.event.workflow_run.conclusion != 'success' &&
      github.event.workflow_run.event != 'pull_request' ||
      github.event.workflow_run.conclusion != 'success'
    runs-on: ubuntu-latest
    steps:
      - name: POST notification
        env:
          GATEWAY_URL: ${{ secrets.NOTIFICATION_GATEWAY_URL }}
          SECRET: ${{ secrets.NOTIFICATION_INGRESS_SECRET }}
        run: |
          # build JSON from github.event.workflow_run + gh api for PR metadata
          curl -sfS -X POST "$GATEWAY_URL" \
            -H "Content-Type: application/json" \
            -H "x-notification-secret: $SECRET" \
            -d @payload.json
```

Refine `if:` to skip cancelled runs and optionally skip advisory unless `conclusion == failure`.

---

## 6. Bot UX (optional)

| Surface | Recommendation |
|---------|----------------|
| **`/e2e-last-failure`** | **Yes**, maintainer-only — calls GitHub API for latest `E2E` / `E2E staging` conclusion + link |
| **`/e2e-status [pr]`** | **Yes**, public read-only — latest workflow runs for PR or `staging` branch |
| **Cron weekly flake digest** | **Later** — parse advisory history; not blocking v1 |
| **Extend `/ci`** | Show E2E + integration job status separately from verify (integration is inside `E2E` job now) |

---

## 7. Secrets & env checklist

### GitHub Actions — `uplbtools/room-tba`

| Name | Playwright | Discord notify |
|------|------------|----------------|
| `E2E_DATABASE_URL` | ✅ | — |
| `E2E_ADMIN_PASSWORD` | ✅ | — |
| `E2E_ADMIN_SESSION_SECRET` | ✅ | — |
| `NOTIFICATION_GATEWAY_URL` | — | ✅ new |
| `NOTIFICATION_INGRESS_SECRET` | — | ✅ new |

### Heroku — `uplbtools-discord-bot`

| Item | Action |
|------|--------|
| `NOTIFICATION_INGRESS_SECRET` | Already shared with Room TBA proposals |
| Channel map | Route `ci.e2e.*` → `#development` (`1522346697282425082`); `ci.staging-smoke.failed` → `#deploys` |
| Event handlers | Add translators for new `type` values; embed template with workflow link + PR link |

### Vercel — room-tba

| Item | Action |
|------|--------|
| Staging smoke | **No Vercel secret needed** — smoke hits public staging URL |
| Optional | `NOTIFICATION_*` on Vercel only if app emits `deploy.succeeded/failed` at runtime (separate from E2E CI) |

### Room TBA runtime (proposals — already wired)

`.env` / Vercel optional:

- `NOTIFICATION_GATEWAY_URL`
- `NOTIFICATION_INGRESS_SECRET`

Code: `src/lib/notifications/` — `getNotificationAdapter()` → `HttpNotificationAdapter`.

---

## 8. Smoke-test plan

1. **Add secrets** `NOTIFICATION_GATEWAY_URL` + `NOTIFICATION_INGRESS_SECRET` to room-tba repo.
2. **Deploy bot** handlers for `ci.e2e.failed` (embed + channel routing).
3. **Merge** `discord-notify-e2e.yml` (or enable on feature branch with `workflow_run` — note: listener must be on **default branch** to receive events; for testing, use temporary failure step in `e2e-reusable.yml` on a branch).
4. **Force failure:** add `test.fail('discord wiring smoke')` in `e2e/smoke/boot.spec.ts` on a test PR → mark ready → expect `#development` message within **~35 min** (full job) + **<30 s** after job completes.
5. **Verify payload:** PR number, workflow URL, artifact name present.
6. **Fix test** → re-run with `run/e2e` label → optional recovery message if implemented.
7. **Advisory:** break `e2e/advisory/a11y.spec.ts` → expect ⚠️ non-blocking message, PR not blocked.
8. **Staging smoke:** break staging spec on push to `staging` → message in `#deploys` within ~5 min.

---

## 9. Open questions / blockers

| # | Blocker | Owner |
|---|---------|-------|
| 1 | **`failedTests` list** — CI only uploads HTML report; add `--reporter=json,json=playwright-report/results.json` and parse in notify step, or upload `test-results/` artifact | room-tba |
| 2 | **New `NotificationEventType` values** — bot must accept `ci.e2e.*` or return 400 | discord-bot |
| 3 | **`workflow_run` on default branch** — notify workflow must live on `staging`/`main` to fire for PR workflows | room-tba |
| 4 | **Embed size** — failed test list may exceed Discord 4096 embed field; cap at 10 tests + “+N more” + link to Actions | discord-bot |
| 5 | **Rate limits** — advisory + blocking + bundle on same `ready_for_review` = 3 posts; consider 60s debounce per PR | discord-bot |
| 6 | **Integration failure message** — distinguish “integration failed (N tests)” vs “Playwright failed (N tests)” via `failedStep` from GitHub API | notify workflow |
| 7 | **Merge gating** — E2E workflow changes on `feat/testing-pyramid` (#447) must land before production CI matches this doc | room-tba |
| 8 | **`ci-notify-discord.yml`** — confirm discard in favor of bot `/notifications` | both |

---

## Quick reference — npm scripts

| Script | Command |
|--------|---------|
| Blocking E2E | `bun run e2e` → `playwright test` |
| Advisory | `bun run e2e:advisory` |
| Staging smoke | `bun run e2e:staging` |
| Integration (local) | `bun run test:integration:live` |
| Reset DB | `bun run e2e:reset-db` |

**Local note:** `bun run e2e` does **not** run integration — only Playwright. Integration is separate locally; CI runs both in blocking job.
