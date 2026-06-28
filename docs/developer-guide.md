# Developer guide

For human developers contributing code. Start with [CONTRIBUTING.md](../CONTRIBUTING.md); this doc covers setup details and repo layout.

## Local setup

| Requirement      | Notes                                                           |
| ---------------- | --------------------------------------------------------------- |
| Bun 1.3+         | Package manager and test runner                                 |
| `DATABASE_URL`   | Supabase Postgres; use the **session pooler** URL for local dev |
| `ADMIN_PASSWORD` | Optional; enables in-app editor login locally                   |

```sh
cp .env.example .env
# Edit .env — DATABASE_URL is required for pages that hit the DB

bun install
bun dev   # http://localhost:4321
```

Without `DATABASE_URL`, the dev server starts but SSR pages that query Postgres return 500. That is expected.

Refreshing a stale `.env`: see [AGENTS.md § Cursor Cloud](../AGENTS.md#cursor-cloud-specific-instructions) or copy `DATABASE_URL` from Vercel / Supabase dashboard.

## Commands

| Command                   | Purpose                                 |
| ------------------------- | --------------------------------------- |
| `bun dev`                 | Dev server                              |
| `bun test src`            | Unit tests (no DB required)             |
| `bun run lint`            | Prettier + ESLint                       |
| `bun run format`          | Prettier write                          |
| `bun run build`           | Production build (needs `DATABASE_URL`) |
| `bunx drizzle-kit studio` | Browse Postgres                         |

PR CI runs Prettier check + `bun test src` only. Run full lint and build locally before merge on substantive changes.

## Project layout

```
src/pages/       Astro routes and /api/*
src/components/  Svelte UI (map, search, editor)
src/lib/         Stores, services, PGlite sync
drizzle/         Postgres schema + SQL migrations (apply before deploy)
docs/            QA checklists and contributor docs
public/          Static assets
```

Do **not** edit `drizzle-migrations/` (archived SQLite history).

## Common gotchas

- **PGlite vs Postgres:** browser offline cache (`src/lib/local/data/pgliteDB.ts`) is separate from server schema. Schema changes need Drizzle migration + PGlite alignment.
- **PR base branch:** target **`staging`**, not `main`.
- **Admin surface:** edit in the map app; `/admin` browser pages redirect into the app.
- **Migrations:** if you add a `drizzle/*.sql` migration, apply it to Supabase before deploying code that depends on it.

## Tests

Unit tests live under `src/**/*.test.ts`. Run all: `bun test src`. Add tests when changing non-trivial lib or API behavior.

## Getting help

- [Discord](https://discord.uplbtools.me) or [Messenger](https://messenger.uplbtools.me)
- Open a [coding task issue](https://github.com/uplbtools/room-tba/issues/new?template=coding_task.yml) or draft PR early for feedback
