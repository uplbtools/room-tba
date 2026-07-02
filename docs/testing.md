# Room TBA testing

Production-grade test pyramid for CI and local development.

## Commands

| Command                          | What                                      |
| -------------------------------- | ----------------------------------------- |
| `bun test src/lib src/constants` | Unit tests (Bun; excludes `*.store.test.ts`) |
| `bun run test:components`        | Vitest store + Svelte component tests       |
| `bun run test:integration`       | HTTP + service tests (E2E DB + preview)   |
| `bun run e2e:reset-db`           | Truncate + seed E2E Supabase (host guard) |
| `bun run e2e`                    | Playwright blocking suite                 |
| `bun run e2e:advisory`           | Playwright advisory (non-blocking in CI)  |
| `bun run e2e:staging`            | Live staging smoke                        |
| `bun run check:migrations`       | Required tables exist on `DATABASE_URL`   |

Full local gate:

```sh
bun run lint && bun run test:all && bun run build && bun run e2e
```

## CI (blocking)

- **CI / verify** — Prettier, ESLint, unit, components, PWA legal, build
- **CI / migrations** — schema table check on E2E DB
- **CI / integration** — reset DB, preview, integration tests
- **E2E / e2e** — Playwright blocking

## CI (advisory, non-blocking)

- **E2E advisory** — axe, touch drag, offline, jeepney, etc.
- **Bundle advisory** — PWA JS size budget

## Databases

| DB                           | Use in tests                                       |
| ---------------------------- | -------------------------------------------------- |
| E2E (`yhzinxlakcewqjaqbbaj`) | CI build, integration, Playwright — **mutating**   |
| Staging                      | Local dev, staging smoke — read-only in automation |
| Production                   | **Never** automated writes                         |

Set locally (gitignored):

```sh
E2E_DATABASE_URL=postgresql://postgres.yhzinxlakcewqjaqbbaj:…@….pooler.supabase.com:5432/postgres
E2E_ADMIN_PASSWORD=…
E2E_ADMIN_SESSION_SECRET=…   # 32+ chars
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

When implementing a GitHub issue, add tests in the **same PR** — do not defer. Use [issue-test-matrix.md](issue-test-matrix.md) for tier hints (unit / integration / component / E2E). Regenerate:

```sh
bun run generate:issue-test-matrix
```

Agent policy: [AGENTS.md § Tests with GitHub issues](../AGENTS.md#tests-with-github-issues).
