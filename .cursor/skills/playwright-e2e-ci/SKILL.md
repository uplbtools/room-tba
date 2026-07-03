---
name: playwright-e2e-ci
description: Runs and debugs Room TBA Playwright E2E, integration tests in CI, workflow gating, E2E database, and staging smoke. Use when e2e fails in GitHub Actions, EMAXCONNSESSION pool errors, run/e2e label, e2e-reusable.yml, or test:integration:live locally.
---

# Playwright + E2E CI

Full doc: [docs/testing.md](../../docs/testing.md). Handoff: [docs/e2e-discord-handoff.md](../../docs/e2e-discord-handoff.md).

## Commands

| Command | Use |
| --- | --- |
| `bun run test:integration:live` | Local CI parity: build:e2e → preview → integration + HTTP |
| `bun run e2e:reset-db` | Truncate + seed E2E Supabase |
| `bun run e2e` | Playwright blocking (~16 min local) |
| `bun run e2e:advisory` | Non-blocking suite |
| `bun run e2e:staging` | Live staging smoke (read-only) |
| `SKIP_E2E_BUILD=1 bun run e2e` | Re-run after first build:e2e |

`test:integration` **without preview** runs service tests only; HTTP suites fail fast.

## Databases

| DB | Automation |
| --- | --- |
| **E2E** (`yhzinxlakcewqjaqbbaj`) | CI integration + Playwright; **mutating** |
| **Staging** | `e2e:staging` smoke; read-only |
| **Production** | **Never** automated writes |

Env: `E2E_DATABASE_URL`, `E2E_ADMIN_PASSWORD`, `E2E_ADMIN_SESSION_SECRET` in GitHub Actions secrets.

## PR CI gating

| Trigger | Runs |
| --- | --- |
| Every push (incl. draft) | `verify` + `migrations` only (~6–9 min) |
| **Ready for review** | Blocking E2E (integration + Playwright) + advisory + bundle |
| **`run/e2e` label** | Re-run heavy stack after fixes |
| Push to **`staging`** | Full blocking E2E + staging-smoke (non-blocking) |

```sh
gh pr ready <number>
gh pr edit <number> --add-label run/e2e
gh pr checks <number> --repo uplbtools/room-tba
```

Ordinary pushes after ready **do not** re-trigger E2E; add label again.

## Blocking job order (e2e-reusable.yml)

1. `bun run e2e:reset-db`
2. `bun run build:e2e`
3. Start preview (`bun run preview:e2e`)
4. **`bun run test:integration`** (with `PREVIEW_BASE_URL`)
5. **`bun run e2e`** (`PLAYWRIGHT_SKIP_WEBSERVER=1`)

Wall clock ~28–35 min in CI.

## Workflows

| File | Name |
| --- | --- |
| `.github/workflows/ci.yml` | verify, migrations |
| `.github/workflows/e2e.yml` | E2E (PR blocking) |
| `.github/workflows/e2e-advisory.yml` | E2E advisory |
| `.github/workflows/e2e-staging.yml` | E2E staging + nightly |
| `.github/workflows/staging-smoke.yml` | Live staging smoke |

## Common CI failures

| Error | Likely cause | Mitigation |
| --- | --- | --- |
| `EMAXCONNSESSION max clients reached` | Too many parallel PG connections in integration job | Serialize tests, lower concurrency, or pooler limits |
| Preview failed to start | build:e2e or port conflict | Read job log before Playwright step |
| staging-smoke `/admin` redirect | Staging deploy lag vs test expectation | Wait for Vercel staging deploy; check live URL |
| Integration pass locally, fail CI | Missing preview or wrong `PREVIEW_BASE_URL` | Use `test:integration:live` |

## Before marking PR ready

```sh
bun run lint && bun test src
bun run test:integration:live   # API/service changes
bun run e2e                     # UI/map/proposal flows
bun run build                   # substantive changes
```

## Spec locations

- `e2e/smoke/`, `e2e/browse/`, `e2e/admin/`
- Inventory: [docs/test-inventory.md](../../docs/test-inventory.md)

## Release PR note

`staging → main` runs E2E + staging-smoke. If only notification/API changes, verify + migrations may suffice for feature PR; release PR still hits full stack. Admin merge only when failures are known infra flakes, not regressions.
