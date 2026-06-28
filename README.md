# Room TBA - UPLB Room Finder

A web app to help UPLB students find rooms on campus. "Saan sa UPLB ang \_\_\_?" Finally answered.

## Features

- Search rooms by name, building, college, division
- Filter rooms by Building, College, or Division
- View room schedules with visual timetable display
- Building information with directions and OpenStreetMap integration
- Room-specific directions for commonly asked-about rooms
- Mobile-responsive design with accessibility features
- Offline support in cases where data is not accessible

## Data

Course and room listings are maintained for UPLB students and updated each term; they currently reflect 2nd Semester AY 2025–2026.

## Development/Contribution

Install [Bun](https://bun.sh/), copy [`.env.example`](.env.example) to `.env`, and set `DATABASE_URL` to your Supabase Postgres connection string (session pooler recommended). `ADMIN_PASSWORD` enables the in-app editor login.

```sh
bun install
bun dev
```

Common commands:

```sh
bun run lint          # prettier + eslint
bun test src          # unit tests (no DATABASE_URL required)
bun run build         # production build (requires DATABASE_URL)
bunx drizzle-kit studio   # inspect/edit Postgres via Drizzle
```

Runtime data lives in **Supabase Postgres**. The legacy `data/info.db` SQLite file is only used by local seed/export scripts, not by the app at runtime.

Agent and contributor workflow: see [AGENTS.md](AGENTS.md) and [docs/agentic-qa-process.md](docs/agentic-qa-process.md). PR CI runs Prettier + unit tests; verify full lint and build locally before merge.

## Project structure

This project uses [Astro](https://astro.build) with Svelte islands:

- `/public` — static assets
- `/src/pages` — routes (Astro pages + API endpoints under `/src/pages/api`)
- `/src/components` — UI components (mostly Svelte)
- `/src/lib` — shared TypeScript helpers, stores, services
- `/drizzle` — Postgres schema and SQL migrations

## Releases and versioning

Versions follow [Semantic Versioning](https://semver.org/). [semantic-release](https://semantic-release.gitbook.io/) runs on every push to `main` (skipping commits that include `[skip ci]`). It reads [Conventional Commits](https://www.conventionalcommits.org/) messages, creates a Git tag, publishes a GitHub release, and opens a follow-up PR to sync `package.json` and `CHANGELOG.md` (required because `main` is protected).

Use prefixes such as `fix:`, `feat:`, or `feat!:` / `BREAKING CHANGE:` so the next version is chosen correctly. To preview what would ship without changing anything:

```
bun run release:dry
```

The footer and status bar show `v{version}` from `package.json` at build time.

## License

[MIT License](LICENSE)

## Author

Developed by [Simonee Ezekiel Mariquit](https://stimmie.dev)

## Contributors

- **Niño Anthony Marmeto** - Helped with Electrical Engineering building information
- **Rosh Almario** - Helped with Institute of Chemistry room directions
- **Ken Ramiscal** - Helped with Developing the UI, offline support, and map functionalities
- **Kalinaw Lukas Aom Bebis** - Helped with developing the UI, bug fixing, and map functionalities
- **Eunice Almeyda** - Logo Designer
- **Mary Gwyneth Telmosa** - UI Designer
