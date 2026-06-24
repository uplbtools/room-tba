# AGENTS.md

## Cursor Cloud specific instructions

This is **Room TBA**, a static Astro site (Astro + Svelte + React) that helps UPLB students find rooms/buildings. It is a single product (no monorepo), with **no runtime backend** — data comes from the committed SQLite file `data/info.db`, read at build/dev time via `better-sqlite3`.

### Tooling / running
- Package manager is **Bun** (installed at `~/.bun/bin`). The update script runs `bun install --frozen-lockfile`. Use Bun, not npm, even though `package-lock.json` is also committed.
- Run commands from the **repo root** — `src/lib/db.ts` opens the DB at `${process.cwd()}/data/info.db`, so running elsewhere breaks data loading.
- Standard scripts live in `package.json`: `bun dev` (Astro dev server on `http://localhost:4321/`), `bun run build`, `bun preview`, `bun run lint`. No automated test suite exists.
- `bun run build` is slow (~80s, builds ~650 static pages); this is expected.

### Known caveats
- `bun run lint` (`prettier --check . && eslint .`) **currently fails on `main`**: many committed files have prettier formatting warnings, and `eslint.config.js` throws `TypeError: Unexpected array` (`svelte.configs.prettier` is an array in the installed plugin version). Both are pre-existing repo issues, not environment problems — don't try to "fix" them as part of setup.
- The app is a single-page experience: search results and room/building details render in an overlay side panel, so the URL stays at `/` during interaction (room detail pages like `/room/<slug>/` also exist as static routes).
