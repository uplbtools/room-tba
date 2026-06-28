<div align="center">

# Room TBA

**Saan sa UPLB ang \___?** · Finally, a straight answer.

[![Live app](https://img.shields.io/badge/open-room--tba.uplbtools.me-maroon?style=for-the-badge)](https://room-tba.uplbtools.me)
[![MIT](https://img.shields.io/badge/license-MIT-brightgreen?style=flat-square)](LICENSE)
[![Bun](https://img.shields.io/badge/bun-1.3+-black?style=flat-square&logo=bun)](https://bun.sh)
[![Astro](https://img.shields.io/badge/Astro-7-BC52EE?style=flat-square&logo=astro)](https://astro.build)

_Schedules, buildings, jeepney routes, and "where is PSLH 1?" on one campus map._

[Open the map](https://room-tba.uplbtools.me) · [Report wrong data](https://github.com/uplbtools/room-tba/issues/new/choose) · [Changelog](https://room-tba.uplbtools.me/changelog)

</div>

---

## What this is

**Room TBA** is a map-first web app for [UPLB](https://uplb.edu.ph) students. You search a room code, building nickname, or course; the app puts it on an interactive campus map, shows schedules when we have them, and keeps working when the signal drops.

No account needed to browse. Editors and contributors fix data in the same app (login popup on the map, not a separate admin site).

> **Data note:** Room and class listings are updated each term by volunteers. The default view targets **2nd Semester AY 2025–2026**. Wrong schedule? [Open an issue](https://github.com/uplbtools/room-tba/issues/new/choose). That is how the dataset gets better.

---

## What you can do (student mode)

| Goal                          | How                                        |
| ----------------------------- | ------------------------------------------ |
| Find **PSLH 1** or **PhySci** | Search + aliases (`PhySci`, `HUM`, …)      |
| Room schedule this sem        | Term filter + timetable                    |
| Building location             | Map, pins, directions, Google Maps         |
| Offline / bad signal          | PWA + local cache; tiles if already loaded |
| Campus events                 | Events on map with routes                  |
| Jeepney routes                | Route overlays on map                      |
| 3D view                       | Buildings + Makiling terrain (online)      |

<details>
<summary><strong>Editor / contributor mode</strong> (password from the team)</summary>

| Power                            | Where                                                                                                            |
| -------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Move building & dorm pins        | Map edit mode (pencil)                                                                                           |
| Fix room/building/college copy   | Side panel → Edit                                                                                                |
| Suggest edits without publishing | **Suggest an edit** → admin review queue                                                                         |
| Upload event posters             | Event editor + R2 image upload (when configured)                                                                 |
| Undo a pin drag                  | Toolbar undo/redo (session); durable history tracked in [#202](https://github.com/uplbtools/room-tba/issues/202) |

Login: **`/?editor=login`** or the shield / status bar in the app. `/admin` URLs redirect back into the map.

</details>

---

## How a search works

```mermaid
flowchart LR
  subgraph browser [Your phone or laptop]
    Search[Search bar]
    PGlite[(PGlite offline cache)]
    Map[Map + side panel]
  end
  subgraph cloud [When online]
    API[Astro API routes]
    DB[(Supabase Postgres)]
  end
  Search --> PGlite
  PGlite -->|stale or empty| API
  API --> DB
  API --> Map
  PGlite --> Map
```

1. **First visit online:** app syncs buildings, rooms, classes, aliases, and events into browser storage.
2. **You search:** local data first; network when sync keys say something changed.
3. **You pick a result:** map flies to the pin; side panel shows schedules, directions, and a share link.
4. **You go offline:** last sync still answers "saan ang room na 'to?" (map tiles need a prior download or visit).

---

## Stack

- [Astro 7](https://astro.build) + [Svelte 5](https://svelte.dev)
- [Bun](https://bun.sh)
- [Supabase](https://supabase.com) Postgres + [Drizzle](https://orm.drizzle.team) (`drizzle/`)
- [PGlite](https://pglite.dev) in the browser for offline data
- [MapLibre GL](https://maplibre.org), OSM / MapTiler tiles
- [Vercel](https://vercel.com) for SSR and API routes
- Cloudflare R2 for event uploads (optional)

Contributor notes: [AGENTS.md](AGENTS.md)

---

## Run it locally

### You need

- [Bun](https://bun.sh) 1.3+
- A **Supabase** Postgres URL (`DATABASE_URL`); session pooler recommended for dev
- `ADMIN_PASSWORD` if you want editor login locally

### Setup

```sh
git clone https://github.com/uplbtools/room-tba.git
cd room-tba
cp .env.example .env
# Fill DATABASE_URL (and ADMIN_PASSWORD) in .env

bun install
bun dev
```

Open **http://localhost:4321**. Without `DATABASE_URL`, the dev server starts but pages that hit the DB will 500. That is expected.

### Commands worth knowing

| Command                   | Does what                                          |
| ------------------------- | -------------------------------------------------- |
| `bun dev`                 | Dev server                                         |
| `bun run build`           | Production build (**needs** `DATABASE_URL`)        |
| `bun test src`            | Unit tests (no DB required)                        |
| `bun run lint`            | Prettier + ESLint                                  |
| `bun run format`          | Prettier write                                     |
| `bunx drizzle-kit studio` | Browse/edit Postgres visually                      |
| `bun run seed:aliases`    | Seed building aliases from `public/room_info.json` |

Legacy **`data/info.db`** SQLite is only for old seed/export scripts. Production does not use it.

Optional env vars (R2 uploads, Supabase Auth client): see [`.env.example`](.env.example).

---

## Repo map

```mermaid
flowchart TB
  root[room-tba]
  root --> src
  root --> drizzle["drizzle/ schema + migrations"]
  root --> docs["docs/ QA and layout notes"]
  root --> public["public/ static assets"]
  root --> agents[AGENTS.md]
  src --> pages["pages/ routes + /api"]
  src --> components["components/ Svelte UI"]
  src --> lib["lib/ stores, services, PGlite sync"]
```

Deep editor QA: [`docs/editor-foundation-test-plan.md`](docs/editor-foundation-test-plan.md)  
PR checklist: [`docs/agentic-qa-process.md`](docs/agentic-qa-process.md)

---

## Contributing

We merge through GitHub. Rough flow:

1. **Find or file an issue.** Implementation details live there; keep them updated ([`docs/issue-hygiene.md`](docs/issue-hygiene.md)).
2. **Branch off `staging`**, hack, run `bun test src` + Prettier.
3. **PR to `staging`.** The template asks for QA evidence; CI runs Prettier + tests.
4. **Human pass** for map/editor UI at 320px if you touched chrome.

Commit messages: [Conventional Commits](https://www.conventionalcommits.org/) (`feat(map): …`, `fix(api): …`). semantic-release uses them on `main`.

**Good first issues:** [good first issue](https://github.com/uplbtools/room-tba/issues?q=is%3Aissue+is%3Aopen+label%3A%22good+first+issue%22) · **Data fixes:** label `data` · **QA passes:** label `qa`

No separate admin dashboard. If you can view it on the map, you should eventually edit it there.

---

## Releases

Version follows semver. Pushes to `main` run [semantic-release](https://semantic-release.gitbook.io/) (skip with `[skip ci]` in the commit message). The in-app status bar shows `vX.Y.Z` from `package.json`.

Dry run: `bun run release:dry`

---

## Credits

**Maintainer:** [Simonee Ezekiel Mariquit](https://stimmie.dev)

**Built with help from:**

| Person                  | Helped with                            |
| ----------------------- | -------------------------------------- |
| Ken Ramiscal            | UI, offline support, map               |
| Kalinaw Lukas Aom Bebis | UI, bug fixes, map                     |
| Niño Anthony Marmeto    | Electrical Engineering building info   |
| Rosh Almario            | Institute of Chemistry room directions |
| Eunice Almeyda          | Logo                                   |
| Mary Gwyneth Telmosa    | UI design                              |

Org: [uplbtools](https://github.com/uplbtools) · Campus tool, not an official UPLB product.

---

## License

[MIT](LICENSE). Use it, fork it, teach with it. If you deploy a fork for another campus, change the data, not just the logo.

---

<div align="center">

**[room-tba.uplbtools.me](https://room-tba.uplbtools.me)** · for people who've asked "Saan ba ang ___?" at least once this week

</div>
