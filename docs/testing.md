# Room TBA testing

Production-grade test pyramid for CI and local development.

## Commands

| Command                          | What                                                         |
| -------------------------------- | ------------------------------------------------------------ |
| `bun test src/lib src/constants` | Unit tests (Bun; excludes `*.store.test.ts`)                 |
| `bun run test:components`        | Vitest store + Svelte component tests                        |
| `bun run test:integration`       | HTTP + service tests (E2E DB; service-only without preview)  |
| `bun run test:integration:live`  | Same as CI: `build:e2e` → preview → integration (incl. HTTP) |
| `bun run e2e:reset-db`           | Truncate + seed E2E Supabase (host guard)                    |
| `bun run e2e`                    | Playwright blocking suite                                    |
| `bun run e2e:advisory`           | Playwright advisory (non-blocking in CI)                     |
| `bun run e2e:staging`            | Live staging smoke                                           |
| `bun run check:migrations`       | Required tables exist on `DATABASE_URL`                      |

Full local gate (before marking PR ready):

```sh
bun run lint && bun run test:all && bun run build
bun run test:integration:live   # needs E2E DB; includes HTTP against preview
bun run e2e                     # Playwright starts its own preview (~16 min first run)
```

`bun run test:integration` alone runs **service/DB tests** only when preview is offline; **HTTP suites fail fast** with instructions. Do not treat a green `test:integration` without preview as full coverage.

E2E runs `serve:e2e`, which rebuilds with `@astrojs/node` because `@astrojs/vercel` does not support `astro preview`. After the first `build:e2e`, speed up reruns with `SKIP_E2E_BUILD=1 bun run e2e`. For fast iteration on an already-running preview, set `PLAYWRIGHT_REUSE_SERVER=1`. Default Playwright workers are **2** locally (**1** in CI via `PLAYWRIGHT_WORKERS`; override either way); the full suite is heavy on one preview server (~16 min locally; ~25 min wall clock in CI).

## CI (every PR push, including drafts)

- **CI / verify** — Biome format, ESLint, unit, components, PWA legal, prod build (~5–8 min)
- **CI / migrations** — schema table check on E2E DB (~1 min)

## CI (gated — ready for review or `run/e2e`)

Heavy DB + preview work runs **once before merge**, not on every draft push:

- **E2E / e2e** — reset DB → `build:e2e` → preview → **integration** → Playwright blocking (~30 min total)
- **E2E advisory** — reset DB → `build:e2e` → Playwright advisory (non-blocking)
- **Bundle advisory** — prod build + JS budget (non-blocking)

**E2E staging / e2e** — same blocking stack (integration + Playwright) on every **`staging` push** and **nightly** (02:00 Asia/Manila)

## Heavy CI gating (PRs)

Integration + Playwright share one preview build in the blocking job (~30 min wall clock). **Draft pushes skip all of this.**

| Trigger                  | Integration + blocking E2E | Advisory E2E + bundle |
| ------------------------ | -------------------------- | --------------------- |
| **Ready for review**     | Yes (first time)           | Yes                   |
| **`run/e2e` label**      | Re-run after fixes         | Re-run                |
| **Reopened** (non-draft) | Yes                        | Yes                   |
| **Draft push**           | No                         | No                    |

**Always on every push:** verify + migrations only.

**Before merge to `staging`:** mark ready (or add `run/e2e`) and wait for **E2E / e2e** green. Pushes after ready do not re-trigger — add the label again.

```sh
gh pr ready <number>
gh pr edit <number> --add-label run/e2e   # re-run integration + E2E + advisory
```

Workflows: [`.github/workflows/ci.yml`](../.github/workflows/ci.yml), [`.github/workflows/e2e.yml`](../.github/workflows/e2e.yml), [`.github/workflows/e2e-advisory.yml`](../.github/workflows/e2e-advisory.yml), [`.github/workflows/e2e-staging.yml`](../.github/workflows/e2e-staging.yml), [`.github/workflows/bundle-advisory.yml`](../.github/workflows/bundle-advisory.yml).

## CI (advisory, non-blocking)

- **E2E advisory** — axe, touch drag, offline, jeepney, etc. (gated like blocking)
- **Bundle advisory** — PWA JS size budget (gated like blocking)
- **Staging smoke** — read-only Playwright against live `staging.room-tba.uplbtools.me` (non-blocking)

## Databases

| DB                           | Use in tests                                       |
| ---------------------------- | -------------------------------------------------- |
| E2E (`yhzinxlakcewqjaqbbaj`) | CI build, integration, Playwright — **mutating**   |
| Staging                      | Local dev, staging smoke — read-only in automation |
| Production                   | **Never** automated writes                         |

Set locally (gitignored — copy from `.env.example`):

```sh
cp .env.example .env.local    # bun dev + E2E vars
cp .env.example .env.staging  # optional: staging smoke / preview DB only
```

GitHub Actions uses secrets `E2E_DATABASE_URL`, `E2E_ADMIN_PASSWORD`, `E2E_ADMIN_SESSION_SECRET`.

## AMIS — never in CI

Do **not** run `import:amis-classes --fetch` in CI. The script exits when `CI=true` and `--fetch` is passed. Unit tests use fixture JSON only.

## Manual only

- Subjective visual polish
- AMIS live fetch (maintainer runbook)
- Mobile drag “feel”
- Post-deploy prod spot-check

See also [docs/editor-foundation-test-plan.md](editor-foundation-test-plan.md) and [docs/agentic-qa-process.md](agentic-qa-process.md).

## Tests with issues

When implementing a GitHub issue, add tests in the **same PR** — do not defer. Use [issue-test-matrix.md](issue-test-matrix.md) for tier hints (unit / integration / component / E2E). Full file list: [test-inventory.md](test-inventory.md). Regenerate:

```sh
bun run generate:issue-test-matrix
bun run generate:test-inventory
```

**Discord `#test-suite`:** CI posts a pinned, auto-updated inventory (summary embed + tier embeds with full file lists) via [discord-test-inventory.yml](../.github/workflows/discord-test-inventory.yml). Local dry-run: `GATEWAY_URL=… SECRET=… bun run post:test-inventory-discord`.

Agent policy: [AGENTS.md § Tests with GitHub issues](../AGENTS.md#tests-with-github-issues).
