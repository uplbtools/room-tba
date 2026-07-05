# Issue → test matrix

Generated audit of GitHub issues vs the [testing pyramid](testing.md).
Regenerate:

```sh
gh issue list --repo uplbtools/room-tba --state all --limit 500 \
  --json number,title,labels,state,body > /tmp/all-issues.json
bun run scripts/generate-issue-test-matrix.ts /tmp/all-issues.json
```

**Agent rule:** when implementing an issue, add or extend tests in the **same PR** per the tiers column. See [AGENTS.md § Tests with issues](../AGENTS.md#tests-with-github-issues).

## Summary

| Metric | Count |
| ------ | ----- |
| Total issues | 264 |
| Open | 126 |
| Open: add/extend tests on implement | 116 |
| Open: verify existing coverage only | 0 |
| Open: manual / no automation | 45 |

## Priority open issues (automation required)

| Issue | Tiers | Test spec |
| ----- | ----- | --------- |
| [#286](https://github.com/uplbtools/room-tba/issues/286) | unit, integration, component, e2e-blocking, e2e-advisory | Fixture/import unit test; optional staging data-fidelity smoke |
| [#287](https://github.com/uplbtools/room-tba/issues/287) | unit, integration, component, e2e-blocking, e2e-advisory, manual-only | Fixture/import unit test; optional staging data-fidelity smoke |
| [#300](https://github.com/uplbtools/room-tba/issues/300) | unit, integration, component, e2e-blocking | Fixture/import unit test; optional staging data-fidelity smoke |
| [#318](https://github.com/uplbtools/room-tba/issues/318) | manual-only | Human coordination checklist |
| [#401](https://github.com/uplbtools/room-tba/issues/401) | unit, integration, component, e2e-blocking | Regression: unit for pure logic; E2E for UI repro |
| [#404](https://github.com/uplbtools/room-tba/issues/404) | unit, component, e2e-blocking, e2e-advisory, manual-only | Regression: unit for pure logic; E2E for UI repro |
| [#405](https://github.com/uplbtools/room-tba/issues/405) | unit, e2e-blocking | Regression: unit for pure logic; E2E for UI repro |

## Open bugs (regression tests mandatory)

| Issue | Tiers | Test spec |
| ----- | ----- | --------- |
| [#401](https://github.com/uplbtools/room-tba/issues/401) | unit, integration, component, e2e-blocking | Regression: unit for pure logic; E2E for UI repro |
| [#404](https://github.com/uplbtools/room-tba/issues/404) | unit, component, e2e-blocking, e2e-advisory, manual-only | Regression: unit for pure logic; E2E for UI repro |
| [#405](https://github.com/uplbtools/room-tba/issues/405) | unit, e2e-blocking | Regression: unit for pure logic; E2E for UI repro |

## E2E blocking backlog

| Issue | State | Tiers | Test spec | Notes |
| ----- | ----- | ----- | --------- | ----- |
| [#15](https://github.com/uplbtools/room-tba/issues/15) [FEATURE] Add buildings that don't have classrooms, such as | OPEN | unit, integration, component, e2e-blocking | integration/services or integration/http | AMIS, fetch manual only |
| [#31](https://github.com/uplbtools/room-tba/issues/31) [DESIGN] Creating a design system | OPEN | unit, integration, component, e2e-blocking, e2e-advisory | sync-keys/store unit; advisory offline-boot | |
| [#43](https://github.com/uplbtools/room-tba/issues/43) [DESIGN] UI improvement based on design system constraints | OPEN | component, e2e-blocking | Vitest layout @320px + Playwright browse/admin spec | |
| [#94](https://github.com/uplbtools/room-tba/issues/94) [FEATURE] When a route is generated to a building, automatic | OPEN | component, e2e-blocking, e2e-advisory | Vitest layout @320px + Playwright browse/admin spec | |
| [#101](https://github.com/uplbtools/room-tba/issues/101) [FEATURE] Communicate offline mode better | OPEN | unit, component, e2e-blocking, e2e-advisory, manual-only | sync-keys/store unit; advisory offline-boot | |
| [#108](https://github.com/uplbtools/room-tba/issues/108) [FEATURE] Add links to smiliar initiatives | OPEN | component, e2e-blocking | Vitest layout @320px + Playwright browse/admin spec | |
| [#116](https://github.com/uplbtools/room-tba/issues/116) [FEATURE] Crop OSM pbf data and make it available offline | OPEN | unit, component, e2e-blocking, e2e-advisory | sync-keys/store unit; advisory offline-boot | |
| [#117](https://github.com/uplbtools/room-tba/issues/117) Improving data management and syncing | OPEN | unit, component, e2e-blocking, e2e-advisory, manual-only | Fixture JSON unit tests in src/lib/amis or schedule-import | AMIS, fetch manual only |
| [#122](https://github.com/uplbtools/room-tba/issues/122) Include SNODLOB and MSI to Rural Route | OPEN | component, e2e-blocking, e2e-advisory | Vitest layout @320px + Playwright browse/admin spec | |
| [#127](https://github.com/uplbtools/room-tba/issues/127) [FEATURE] Add image to dorm card | OPEN | component, e2e-blocking, e2e-advisory, manual-only | e2e/browse/entity-seo.spec.ts pattern | |
| [#128](https://github.com/uplbtools/room-tba/issues/128) [FEATURE] Open Graph metadata for entity pages (rooms, build | OPEN | unit, integration, component, e2e-blocking, e2e-advisory, manual-only | HTTP integration + unit for guards/helpers | |
| [#142](https://github.com/uplbtools/room-tba/issues/142) [MUST READ] Raising issues in Room TBA | OPEN | e2e-blocking | Default: at least one automated test for acceptance criteria | |
| [#145](https://github.com/uplbtools/room-tba/issues/145) [REFACTOR] Switching to SvelteKit for better seo integration | OPEN | unit, e2e-blocking, e2e-advisory | e2e/browse/entity-seo.spec.ts pattern | |
| [#146](https://github.com/uplbtools/room-tba/issues/146) Version Kite | OPEN | e2e-blocking | Default: at least one automated test for acceptance criteria | |
| [#152](https://github.com/uplbtools/room-tba/issues/152) [DESIGN] Building position editor design | OPEN | integration, e2e-blocking | e2e/admin/* + integration 409/version | |
| [#156](https://github.com/uplbtools/room-tba/issues/156) [FEATURE] Real jeepney route data and map layer | OPEN | unit, integration, component, e2e-blocking, e2e-advisory, manual-only | integration/services or integration/http | |
| [#157](https://github.com/uplbtools/room-tba/issues/157) [FEATURE] Campus gates and entry points | OPEN | unit, integration, component, e2e-blocking, e2e-advisory | integration/services or integration/http | |
| [#158](https://github.com/uplbtools/room-tba/issues/158) [FEATURE] Facilities taxonomy for rooms | OPEN | unit, integration, component, e2e-blocking, e2e-advisory | integration/services or integration/http | |
| [#160](https://github.com/uplbtools/room-tba/issues/160) [FEATURE] Food, study, and service POIs | OPEN | unit, integration, component, e2e-blocking, e2e-advisory | integration/services or integration/http | |
| [#170](https://github.com/uplbtools/room-tba/issues/170) Investigate vector-of-triples representation for 3D building | OPEN | unit, integration, component, e2e-blocking, e2e-advisory, manual-only | integration/services or integration/http | |
| [#191](https://github.com/uplbtools/room-tba/issues/191) [FEATURE] Generalized entity images (buildings, rooms, dorms | OPEN | unit, integration, component, e2e-blocking, e2e-advisory | HTTP integration + unit for guards/helpers | |
| [#202](https://github.com/uplbtools/room-tba/issues/202) [FEATURE] Finalize Google Docs–style editor version history | OPEN | unit, integration, component, e2e-blocking, e2e-advisory, manual-only | HTTP integration + unit for guards/helpers | |
| [#213](https://github.com/uplbtools/room-tba/issues/213) Encourage users to install Room TBA via browser Add to Home | OPEN | unit, integration, component, e2e-blocking, e2e-advisory | sync-keys/store unit; advisory offline-boot | |
| [#214](https://github.com/uplbtools/room-tba/issues/214) Add push notifications pipeline for campus updates and event | OPEN | unit, integration, component, e2e-blocking, e2e-advisory | HTTP integration + unit for guards/helpers | |
| [#226](https://github.com/uplbtools/room-tba/issues/226) [QA] Publish volunteer QA issue template and screenshot how- | OPEN | e2e-blocking | Playwright repro of reporter steps + no pageerror | |
| [#227](https://github.com/uplbtools/room-tba/issues/227) Rich proposal diffs in editor review queue (#208, #202 follo | OPEN | integration, component, e2e-blocking | integration/services or integration/http | |
| [#230](https://github.com/uplbtools/room-tba/issues/230) [DATA] Unify PGlite schema with Drizzle (codegen init SQL) | OPEN | unit, integration, component, e2e-blocking, e2e-advisory | integration/services or integration/http | |
| [#234](https://github.com/uplbtools/room-tba/issues/234) [DATA] Verify dorm metadata (10 dorms) | OPEN | unit, integration, e2e-blocking | Fixture/import unit test; optional staging data-fidelity smoke | No live AMIS fetch in CI |
| [#235](https://github.com/uplbtools/room-tba/issues/235) [DATA] Campus events seed list for next term | OPEN | unit, integration, e2e-blocking | Fixture/import unit test; optional staging data-fidelity smoke | No live AMIS fetch in CI |
| [#236](https://github.com/uplbtools/room-tba/issues/236) [QA] Sprint 1 smoke checklist: browse and offline | OPEN | unit, component, e2e-blocking, e2e-advisory | Playwright repro of reporter steps + no pageerror | |
| [#237](https://github.com/uplbtools/room-tba/issues/237) [QA] Sync toast and status bar regression | OPEN | unit, e2e-blocking, e2e-advisory | Playwright repro of reporter steps + no pageerror | |
| [#238](https://github.com/uplbtools/room-tba/issues/238) [QA] Editor pin move manual pass | OPEN | integration, e2e-blocking | Playwright repro of reporter steps + no pageerror | |
| [#240](https://github.com/uplbtools/room-tba/issues/240) Theme schedule canvas to Room TBA design tokens | OPEN | unit, e2e-blocking | Default: unit for new lib logic; E2E for user-visible AC | |
| [#241](https://github.com/uplbtools/room-tba/issues/241) Mobile schedule UX pass (320px) | OPEN | component, e2e-blocking | Vitest layout @320px + Playwright browse/admin spec | |
| [#242](https://github.com/uplbtools/room-tba/issues/242) [DATA] Verify 20 course codes map to room schedules | OPEN | unit, integration, component, e2e-blocking | Fixture/import unit test; optional staging data-fidelity smoke | No live AMIS fetch in CI; AMIS, fetch manual only |
| [#245](https://github.com/uplbtools/room-tba/issues/245) [QA] Schedule UAT: 10 rooms x 3 courses | OPEN | e2e-blocking | Playwright repro of reporter steps + no pageerror | |
| [#246](https://github.com/uplbtools/room-tba/issues/246) [QA] Class search empty and error states | OPEN | component, e2e-blocking | Playwright repro of reporter steps + no pageerror | |
| [#247](https://github.com/uplbtools/room-tba/issues/247) [QA] Visual pass: schedule matches map chrome | OPEN | component, e2e-blocking | Playwright repro of reporter steps + no pageerror | |
| [#248](https://github.com/uplbtools/room-tba/issues/248) Org profiles and stable URL slugs | OPEN | e2e-blocking | e2e/browse/entity-seo.spec.ts pattern | |
| [#250](https://github.com/uplbtools/room-tba/issues/250) [DATA] Event images and metadata pack (5 events) | OPEN | unit, integration, e2e-blocking | Fixture/import unit test; optional staging data-fidelity smoke | No live AMIS fetch in CI |
| [#253](https://github.com/uplbtools/room-tba/issues/253) [QA] Editor regression: full test plan | OPEN | integration, e2e-blocking | Playwright repro of reporter steps + no pageerror | |
| [#254](https://github.com/uplbtools/room-tba/issues/254) [QA] Events list and map focus pass | OPEN | component, e2e-blocking | Playwright repro of reporter steps + no pageerror | |
| [#255](https://github.com/uplbtools/room-tba/issues/255) [QA] Contributor proposal happy path | OPEN | integration, e2e-blocking | Playwright repro of reporter steps + no pageerror | |
| [#260](https://github.com/uplbtools/room-tba/issues/260) [DATA] Offline maps test campus zones | OPEN | unit, integration, component, e2e-blocking, e2e-advisory | Fixture/import unit test; optional staging data-fidelity smoke | No live AMIS fetch in CI |
| [#261](https://github.com/uplbtools/room-tba/issues/261) [QA] Offline mode walkthrough | OPEN | unit, e2e-blocking, e2e-advisory | Playwright repro of reporter steps + no pageerror | |
| [#262](https://github.com/uplbtools/room-tba/issues/262) [QA] PWA install screenshots: Android and iOS | OPEN | unit, e2e-blocking, e2e-advisory | Playwright repro of reporter steps + no pageerror | |
| [#263](https://github.com/uplbtools/room-tba/issues/263) [QA] Performance spot-check (3 devices) | OPEN | e2e-blocking, e2e-advisory, manual-only | Playwright repro of reporter steps + no pageerror | |
| [#264](https://github.com/uplbtools/room-tba/issues/264) Campus partner UI surfaces (labeled placements) | OPEN | unit, e2e-blocking | Default: unit for new lib logic; E2E for user-visible AC | |
| [#267](https://github.com/uplbtools/room-tba/issues/267) [QA] Launch sign-off checklist | OPEN | e2e-blocking | Playwright repro of reporter steps + no pageerror | |
| [#268](https://github.com/uplbtools/room-tba/issues/268) [QA] SEO spot-check (10 room URLs) | OPEN | e2e-blocking | Playwright repro of reporter steps + no pageerror | |
| [#269](https://github.com/uplbtools/room-tba/issues/269) [QA] Accessibility quick pass | OPEN | unit, integration, component, e2e-blocking, e2e-advisory | Playwright repro of reporter steps + no pageerror | |
| [#270](https://github.com/uplbtools/room-tba/issues/270) [QA] Changelog and version label verify | OPEN | e2e-blocking | Playwright repro of reporter steps + no pageerror | |
| [#273](https://github.com/uplbtools/room-tba/issues/273) [FEATURE] Entity merge pipeline (rooms ✅; buildings, college | OPEN | unit, integration, e2e-blocking, e2e-advisory | integration/services or integration/http | |
| [#274](https://github.com/uplbtools/room-tba/issues/274) Editor avatars and automatic editor credits in home modal | OPEN | unit, integration, component, e2e-blocking, e2e-advisory | HTTP integration + unit for guards/helpers | |
| [#275](https://github.com/uplbtools/room-tba/issues/275) Automatic dev credits from git commits with editable profile | OPEN | unit, integration, component, e2e-blocking, e2e-advisory | HTTP integration + unit for guards/helpers | |
| [#286](https://github.com/uplbtools/room-tba/issues/286) [DATA] simplify AMIS JSON import into Supabase classes | OPEN | unit, integration, component, e2e-blocking, e2e-advisory | Fixture/import unit test; optional staging data-fidelity smoke | No live AMIS fetch in CI; AMIS, fetch manual only |
| [#287](https://github.com/uplbtools/room-tba/issues/287) [DATA] Quick class refresh when AMIS publishes updated JSON | OPEN | unit, integration, component, e2e-blocking, e2e-advisory, manual-only | Fixture/import unit test; optional staging data-fidelity smoke | No live AMIS fetch in CI; AMIS, fetch manual only |
| [#289](https://github.com/uplbtools/room-tba/issues/289) [INFRA] Separate staging database | OPEN | unit, integration, e2e-blocking, e2e-advisory | HTTP integration + unit for guards/helpers | |
| [#293](https://github.com/uplbtools/room-tba/issues/293) [INFRA] Consolidate editor auth on Supabase | OPEN | unit, integration, component, e2e-blocking | HTTP integration + unit for guards/helpers | |
| [#294](https://github.com/uplbtools/room-tba/issues/294) [CHORE] Remove legacy SQLite deps and sync contributor READM | OPEN | unit, integration, component, e2e-blocking, e2e-advisory | integration/services or integration/http | AMIS, fetch manual only |
| [#295](https://github.com/uplbtools/room-tba/issues/295) [REFACTOR] Split store.svelte.ts into domain modules | OPEN | unit, integration, component, e2e-blocking, e2e-advisory | HTTP integration + unit for guards/helpers | |
| [#300](https://github.com/uplbtools/room-tba/issues/300) [DATA] AMIS facility aliases and TBA room fallback for class | OPEN | unit, integration, component, e2e-blocking | Fixture/import unit test; optional staging data-fidelity smoke | No live AMIS fetch in CI; AMIS, fetch manual only |
| [#310](https://github.com/uplbtools/room-tba/issues/310) [FEATURE] Contributor profile with avatar and social links | OPEN | unit, integration, component, e2e-blocking | HTTP integration + unit for guards/helpers | |
| [#313](https://github.com/uplbtools/room-tba/issues/313) [INFRA] Monitor API and page latency (p95, p99) | OPEN | unit, integration, component, e2e-blocking, e2e-advisory, manual-only | integration/services or integration/http | |
| [#327](https://github.com/uplbtools/room-tba/issues/327) [FEATURE] Final exam schedule viewer | OPEN | unit, integration, component, e2e-blocking, e2e-advisory, manual-only | HTTP integration + unit for guards/helpers | AMIS, fetch manual only |
| [#337](https://github.com/uplbtools/room-tba/issues/337) [UX] Categorized offline downloads (maps, class data, contex | OPEN | unit, integration, component, e2e-blocking, e2e-advisory, manual-only | integration/services or integration/http | AMIS, fetch manual only |
| [#381](https://github.com/uplbtools/room-tba/issues/381) [FEATURE] Dark mode, themes, and Settings tab | OPEN | unit, integration, component, e2e-blocking, e2e-advisory | e2e/advisory/a11y.spec.ts target surface | |
| [#401](https://github.com/uplbtools/room-tba/issues/401) Browse Buildings/Colleges/Divisions chips in search bar don' | OPEN | unit, integration, component, e2e-blocking | Regression: unit for pure logic; E2E for UI repro | |
| [#404](https://github.com/uplbtools/room-tba/issues/404) Jeepney route paths take very long to appear on map | OPEN | unit, component, e2e-blocking, e2e-advisory, manual-only | Regression: unit for pure logic; E2E for UI repro | |
| [#405](https://github.com/uplbtools/room-tba/issues/405) Legal pages: back link looks like plain text; missing spaces | OPEN | unit, e2e-blocking | Regression: unit for pure logic; E2E for UI repro | |
| [#406](https://github.com/uplbtools/room-tba/issues/406) Use Discord and Messenger brand logos for community links | OPEN | unit, e2e-blocking | Default: unit for new lib logic; E2E for user-visible AC | |
| [#408](https://github.com/uplbtools/room-tba/issues/408) [feat] Academic calendar viewer | OPEN | unit, integration, component, e2e-blocking | integration/services or integration/http | AMIS, fetch manual only |
| [#409](https://github.com/uplbtools/room-tba/issues/409) [feat] Classes browser: show LAB sections paired with LEC | OPEN | unit, integration, component, e2e-blocking | HTTP integration + unit for guards/helpers | AMIS, fetch manual only |
| [#410](https://github.com/uplbtools/room-tba/issues/410) [feat] Student FAQ page (incl. where 3D building models come | OPEN | unit, integration, component, e2e-blocking, e2e-advisory, manual-only | HTTP integration + unit for guards/helpers | AMIS, fetch manual only |
| [#411](https://github.com/uplbtools/room-tba/issues/411) Mobile detail sheet: Google Maps–style drag, slimmer handle, | OPEN | component, e2e-blocking, e2e-advisory | e2e/advisory/a11y.spec.ts target surface | |
| [#412](https://github.com/uplbtools/room-tba/issues/412) Implement cursor pagination for class list API and side-pane | OPEN | unit, integration, component, e2e-blocking, e2e-advisory, manual-only | HTTP integration + unit for guards/helpers | AMIS, fetch manual only |
| [#413](https://github.com/uplbtools/room-tba/issues/413) Uniform scrollbar styling in modals (and shared scroll regio | OPEN | integration, component, e2e-blocking | Vitest layout @320px + Playwright browse/admin spec | |
| [#414](https://github.com/uplbtools/room-tba/issues/414) Whimsical, campus-forward redesign for app loading screen | OPEN | unit, integration, component, e2e-blocking, e2e-advisory, manual-only | sync-keys/store unit; advisory offline-boot | |
| [#415](https://github.com/uplbtools/room-tba/issues/415) Cache-first bootstrap: show all saved offline data immediate | OPEN | unit, integration, component, e2e-blocking, e2e-advisory, manual-only | HTTP integration + unit for guards/helpers | AMIS, fetch manual only |
| [#416](https://github.com/uplbtools/room-tba/issues/416) Shared EntityExternalLink component for uniform off-site lin | OPEN | component, e2e-blocking, e2e-advisory | e2e/advisory/a11y.spec.ts target surface | |
| [#417](https://github.com/uplbtools/room-tba/issues/417) Improve bottom bar (bottom chrome) layout, hierarchy, and mo | OPEN | unit, integration, component, e2e-blocking, e2e-advisory | integration/services or integration/http | |
| [#418](https://github.com/uplbtools/room-tba/issues/418) [DATA] Import roomless class types (thesis, special problem) | OPEN | unit, integration, component, e2e-blocking, e2e-advisory | integration/services or integration/http | AMIS, fetch manual only |
| [#424](https://github.com/uplbtools/room-tba/issues/424) Side panel collapse tab looks stacked on the drawer, not par | OPEN | component, e2e-blocking, e2e-advisory | e2e/advisory/a11y.spec.ts target surface | |
| [#426](https://github.com/uplbtools/room-tba/issues/426) Entity edit / suggest forms: text too small and low contrast | OPEN | integration, component, e2e-blocking, e2e-advisory | e2e/advisory/a11y.spec.ts target surface | |
| [#427](https://github.com/uplbtools/room-tba/issues/427) Side panel empty states: more whimsical, campus-forward visu | OPEN | integration, component, e2e-blocking, e2e-advisory, manual-only | integration/services or integration/http | |
| [#441](https://github.com/uplbtools/room-tba/issues/441) perf(infra): Cloudflare CDN cache in front of Vercel | OPEN | unit, integration, component, e2e-blocking, e2e-advisory, manual-only | HTTP integration + unit for guards/helpers | |
| [#442](https://github.com/uplbtools/room-tba/issues/442) perf(infra): R2 public CDN domain for event images | OPEN | unit, integration, e2e-blocking | HTTP integration + unit for guards/helpers | |
| [#443](https://github.com/uplbtools/room-tba/issues/443) feat(auth): Cloudflare Turnstile on editor login | OPEN | unit, integration, component, e2e-blocking | HTTP integration + unit for guards/helpers | |

## Integration backlog

| Issue | State | Tiers | Test spec | Notes |
| ----- | ----- | ----- | --------- | ----- |
| [#15](https://github.com/uplbtools/room-tba/issues/15) [FEATURE] Add buildings that don't have classrooms, such as | OPEN | unit, integration, component, e2e-blocking | integration/services or integration/http | AMIS, fetch manual only |
| [#31](https://github.com/uplbtools/room-tba/issues/31) [DESIGN] Creating a design system | OPEN | unit, integration, component, e2e-blocking, e2e-advisory | sync-keys/store unit; advisory offline-boot | |
| [#128](https://github.com/uplbtools/room-tba/issues/128) [FEATURE] Open Graph metadata for entity pages (rooms, build | OPEN | unit, integration, component, e2e-blocking, e2e-advisory, manual-only | HTTP integration + unit for guards/helpers | |
| [#152](https://github.com/uplbtools/room-tba/issues/152) [DESIGN] Building position editor design | OPEN | integration, e2e-blocking | e2e/admin/* + integration 409/version | |
| [#156](https://github.com/uplbtools/room-tba/issues/156) [FEATURE] Real jeepney route data and map layer | OPEN | unit, integration, component, e2e-blocking, e2e-advisory, manual-only | integration/services or integration/http | |
| [#157](https://github.com/uplbtools/room-tba/issues/157) [FEATURE] Campus gates and entry points | OPEN | unit, integration, component, e2e-blocking, e2e-advisory | integration/services or integration/http | |
| [#158](https://github.com/uplbtools/room-tba/issues/158) [FEATURE] Facilities taxonomy for rooms | OPEN | unit, integration, component, e2e-blocking, e2e-advisory | integration/services or integration/http | |
| [#160](https://github.com/uplbtools/room-tba/issues/160) [FEATURE] Food, study, and service POIs | OPEN | unit, integration, component, e2e-blocking, e2e-advisory | integration/services or integration/http | |
| [#170](https://github.com/uplbtools/room-tba/issues/170) Investigate vector-of-triples representation for 3D building | OPEN | unit, integration, component, e2e-blocking, e2e-advisory, manual-only | integration/services or integration/http | |
| [#191](https://github.com/uplbtools/room-tba/issues/191) [FEATURE] Generalized entity images (buildings, rooms, dorms | OPEN | unit, integration, component, e2e-blocking, e2e-advisory | HTTP integration + unit for guards/helpers | |
| [#202](https://github.com/uplbtools/room-tba/issues/202) [FEATURE] Finalize Google Docs–style editor version history | OPEN | unit, integration, component, e2e-blocking, e2e-advisory, manual-only | HTTP integration + unit for guards/helpers | |
| [#213](https://github.com/uplbtools/room-tba/issues/213) Encourage users to install Room TBA via browser Add to Home | OPEN | unit, integration, component, e2e-blocking, e2e-advisory | sync-keys/store unit; advisory offline-boot | |
| [#214](https://github.com/uplbtools/room-tba/issues/214) Add push notifications pipeline for campus updates and event | OPEN | unit, integration, component, e2e-blocking, e2e-advisory | HTTP integration + unit for guards/helpers | |
| [#227](https://github.com/uplbtools/room-tba/issues/227) Rich proposal diffs in editor review queue (#208, #202 follo | OPEN | integration, component, e2e-blocking | integration/services or integration/http | |
| [#228](https://github.com/uplbtools/room-tba/issues/228) [DATA] Publish volunteer DATA issue template and spreadsheet | OPEN | unit, integration | Fixture/import unit test; optional staging data-fidelity smoke | No live AMIS fetch in CI |
| [#230](https://github.com/uplbtools/room-tba/issues/230) [DATA] Unify PGlite schema with Drizzle (codegen init SQL) | OPEN | unit, integration, component, e2e-blocking, e2e-advisory | integration/services or integration/http | |
| [#232](https://github.com/uplbtools/room-tba/issues/232) [DATA] Room pin audit: Batch 1 (50 buildings) | OPEN | unit, integration | Fixture/import unit test; optional staging data-fidelity smoke | No live AMIS fetch in CI |
| [#233](https://github.com/uplbtools/room-tba/issues/233) [DATA] Report wrong room codes via issue template | OPEN | unit, integration | Fixture/import unit test; optional staging data-fidelity smoke | No live AMIS fetch in CI |
| [#234](https://github.com/uplbtools/room-tba/issues/234) [DATA] Verify dorm metadata (10 dorms) | OPEN | unit, integration, e2e-blocking | Fixture/import unit test; optional staging data-fidelity smoke | No live AMIS fetch in CI |
| [#235](https://github.com/uplbtools/room-tba/issues/235) [DATA] Campus events seed list for next term | OPEN | unit, integration, e2e-blocking | Fixture/import unit test; optional staging data-fidelity smoke | No live AMIS fetch in CI |
| [#238](https://github.com/uplbtools/room-tba/issues/238) [QA] Editor pin move manual pass | OPEN | integration, e2e-blocking | Playwright repro of reporter steps + no pageerror | |
| [#242](https://github.com/uplbtools/room-tba/issues/242) [DATA] Verify 20 course codes map to room schedules | OPEN | unit, integration, component, e2e-blocking | Fixture/import unit test; optional staging data-fidelity smoke | No live AMIS fetch in CI; AMIS, fetch manual only |
| [#243](https://github.com/uplbtools/room-tba/issues/243) [DATA] Term calendar dates one-pager | OPEN | unit, integration | Fixture/import unit test; optional staging data-fidelity smoke | No live AMIS fetch in CI |
| [#244](https://github.com/uplbtools/room-tba/issues/244) [DATA] Alias and synonym suggestions spreadsheet | OPEN | unit, integration | Fixture/import unit test; optional staging data-fidelity smoke | No live AMIS fetch in CI |
| [#249](https://github.com/uplbtools/room-tba/issues/249) [DATA] Gate and entry point coordinates spreadsheet | OPEN | unit, integration | Fixture/import unit test; optional staging data-fidelity smoke | No live AMIS fetch in CI |
| [#250](https://github.com/uplbtools/room-tba/issues/250) [DATA] Event images and metadata pack (5 events) | OPEN | unit, integration, e2e-blocking | Fixture/import unit test; optional staging data-fidelity smoke | No live AMIS fetch in CI |
| [#251](https://github.com/uplbtools/room-tba/issues/251) [DATA] College and division blurbs | OPEN | unit, integration | Fixture/import unit test; optional staging data-fidelity smoke | No live AMIS fetch in CI |
| [#252](https://github.com/uplbtools/room-tba/issues/252) [DATA] Buildings without classrooms inventory | OPEN | unit, integration | Fixture/import unit test; optional staging data-fidelity smoke | No live AMIS fetch in CI |
| [#253](https://github.com/uplbtools/room-tba/issues/253) [QA] Editor regression: full test plan | OPEN | integration, e2e-blocking | Playwright repro of reporter steps + no pageerror | |
| [#255](https://github.com/uplbtools/room-tba/issues/255) [QA] Contributor proposal happy path | OPEN | integration, e2e-blocking | Playwright repro of reporter steps + no pageerror | |
| [#258](https://github.com/uplbtools/room-tba/issues/258) [DATA] Campus partner prospect list (10 orgs) | OPEN | unit, integration | Fixture/import unit test; optional staging data-fidelity smoke | No live AMIS fetch in CI |
| [#259](https://github.com/uplbtools/room-tba/issues/259) [DATA] Food and study POI draft pins (15 POIs) | OPEN | unit, integration | Fixture/import unit test; optional staging data-fidelity smoke | No live AMIS fetch in CI |
| [#260](https://github.com/uplbtools/room-tba/issues/260) [DATA] Offline maps test campus zones | OPEN | unit, integration, component, e2e-blocking, e2e-advisory | Fixture/import unit test; optional staging data-fidelity smoke | No live AMIS fetch in CI |
| [#266](https://github.com/uplbtools/room-tba/issues/266) [DATA] Launch partner pack (3 partners live) | OPEN | unit, integration | Fixture/import unit test; optional staging data-fidelity smoke | No live AMIS fetch in CI |
| [#269](https://github.com/uplbtools/room-tba/issues/269) [QA] Accessibility quick pass | OPEN | unit, integration, component, e2e-blocking, e2e-advisory | Playwright repro of reporter steps + no pageerror | |
| [#273](https://github.com/uplbtools/room-tba/issues/273) [FEATURE] Entity merge pipeline (rooms ✅; buildings, college | OPEN | unit, integration, e2e-blocking, e2e-advisory | integration/services or integration/http | |
| [#274](https://github.com/uplbtools/room-tba/issues/274) Editor avatars and automatic editor credits in home modal | OPEN | unit, integration, component, e2e-blocking, e2e-advisory | HTTP integration + unit for guards/helpers | |
| [#275](https://github.com/uplbtools/room-tba/issues/275) Automatic dev credits from git commits with editable profile | OPEN | unit, integration, component, e2e-blocking, e2e-advisory | HTTP integration + unit for guards/helpers | |
| [#286](https://github.com/uplbtools/room-tba/issues/286) [DATA] simplify AMIS JSON import into Supabase classes | OPEN | unit, integration, component, e2e-blocking, e2e-advisory | Fixture/import unit test; optional staging data-fidelity smoke | No live AMIS fetch in CI; AMIS, fetch manual only |
| [#287](https://github.com/uplbtools/room-tba/issues/287) [DATA] Quick class refresh when AMIS publishes updated JSON | OPEN | unit, integration, component, e2e-blocking, e2e-advisory, manual-only | Fixture/import unit test; optional staging data-fidelity smoke | No live AMIS fetch in CI; AMIS, fetch manual only |
| [#289](https://github.com/uplbtools/room-tba/issues/289) [INFRA] Separate staging database | OPEN | unit, integration, e2e-blocking, e2e-advisory | HTTP integration + unit for guards/helpers | |
| [#293](https://github.com/uplbtools/room-tba/issues/293) [INFRA] Consolidate editor auth on Supabase | OPEN | unit, integration, component, e2e-blocking | HTTP integration + unit for guards/helpers | |
| [#294](https://github.com/uplbtools/room-tba/issues/294) [CHORE] Remove legacy SQLite deps and sync contributor READM | OPEN | unit, integration, component, e2e-blocking, e2e-advisory | integration/services or integration/http | AMIS, fetch manual only |
| [#295](https://github.com/uplbtools/room-tba/issues/295) [REFACTOR] Split store.svelte.ts into domain modules | OPEN | unit, integration, component, e2e-blocking, e2e-advisory | HTTP integration + unit for guards/helpers | |
| [#300](https://github.com/uplbtools/room-tba/issues/300) [DATA] AMIS facility aliases and TBA room fallback for class | OPEN | unit, integration, component, e2e-blocking | Fixture/import unit test; optional staging data-fidelity smoke | No live AMIS fetch in CI; AMIS, fetch manual only |
| [#310](https://github.com/uplbtools/room-tba/issues/310) [FEATURE] Contributor profile with avatar and social links | OPEN | unit, integration, component, e2e-blocking | HTTP integration + unit for guards/helpers | |
| [#313](https://github.com/uplbtools/room-tba/issues/313) [INFRA] Monitor API and page latency (p95, p99) | OPEN | unit, integration, component, e2e-blocking, e2e-advisory, manual-only | integration/services or integration/http | |
| [#327](https://github.com/uplbtools/room-tba/issues/327) [FEATURE] Final exam schedule viewer | OPEN | unit, integration, component, e2e-blocking, e2e-advisory, manual-only | HTTP integration + unit for guards/helpers | AMIS, fetch manual only |
| [#337](https://github.com/uplbtools/room-tba/issues/337) [UX] Categorized offline downloads (maps, class data, contex | OPEN | unit, integration, component, e2e-blocking, e2e-advisory, manual-only | integration/services or integration/http | AMIS, fetch manual only |
| [#381](https://github.com/uplbtools/room-tba/issues/381) [FEATURE] Dark mode, themes, and Settings tab | OPEN | unit, integration, component, e2e-blocking, e2e-advisory | e2e/advisory/a11y.spec.ts target surface | |
| [#401](https://github.com/uplbtools/room-tba/issues/401) Browse Buildings/Colleges/Divisions chips in search bar don' | OPEN | unit, integration, component, e2e-blocking | Regression: unit for pure logic; E2E for UI repro | |
| [#408](https://github.com/uplbtools/room-tba/issues/408) [feat] Academic calendar viewer | OPEN | unit, integration, component, e2e-blocking | integration/services or integration/http | AMIS, fetch manual only |
| [#409](https://github.com/uplbtools/room-tba/issues/409) [feat] Classes browser: show LAB sections paired with LEC | OPEN | unit, integration, component, e2e-blocking | HTTP integration + unit for guards/helpers | AMIS, fetch manual only |
| [#410](https://github.com/uplbtools/room-tba/issues/410) [feat] Student FAQ page (incl. where 3D building models come | OPEN | unit, integration, component, e2e-blocking, e2e-advisory, manual-only | HTTP integration + unit for guards/helpers | AMIS, fetch manual only |
| [#412](https://github.com/uplbtools/room-tba/issues/412) Implement cursor pagination for class list API and side-pane | OPEN | unit, integration, component, e2e-blocking, e2e-advisory, manual-only | HTTP integration + unit for guards/helpers | AMIS, fetch manual only |
| [#413](https://github.com/uplbtools/room-tba/issues/413) Uniform scrollbar styling in modals (and shared scroll regio | OPEN | integration, component, e2e-blocking | Vitest layout @320px + Playwright browse/admin spec | |
| [#414](https://github.com/uplbtools/room-tba/issues/414) Whimsical, campus-forward redesign for app loading screen | OPEN | unit, integration, component, e2e-blocking, e2e-advisory, manual-only | sync-keys/store unit; advisory offline-boot | |
| [#415](https://github.com/uplbtools/room-tba/issues/415) Cache-first bootstrap: show all saved offline data immediate | OPEN | unit, integration, component, e2e-blocking, e2e-advisory, manual-only | HTTP integration + unit for guards/helpers | AMIS, fetch manual only |
| [#417](https://github.com/uplbtools/room-tba/issues/417) Improve bottom bar (bottom chrome) layout, hierarchy, and mo | OPEN | unit, integration, component, e2e-blocking, e2e-advisory | integration/services or integration/http | |
| [#418](https://github.com/uplbtools/room-tba/issues/418) [DATA] Import roomless class types (thesis, special problem) | OPEN | unit, integration, component, e2e-blocking, e2e-advisory | integration/services or integration/http | AMIS, fetch manual only |
| [#426](https://github.com/uplbtools/room-tba/issues/426) Entity edit / suggest forms: text too small and low contrast | OPEN | integration, component, e2e-blocking, e2e-advisory | e2e/advisory/a11y.spec.ts target surface | |
| [#427](https://github.com/uplbtools/room-tba/issues/427) Side panel empty states: more whimsical, campus-forward visu | OPEN | integration, component, e2e-blocking, e2e-advisory, manual-only | integration/services or integration/http | |
| [#441](https://github.com/uplbtools/room-tba/issues/441) perf(infra): Cloudflare CDN cache in front of Vercel | OPEN | unit, integration, component, e2e-blocking, e2e-advisory, manual-only | HTTP integration + unit for guards/helpers | |
| [#442](https://github.com/uplbtools/room-tba/issues/442) perf(infra): R2 public CDN domain for event images | OPEN | unit, integration, e2e-blocking | HTTP integration + unit for guards/helpers | |
| [#443](https://github.com/uplbtools/room-tba/issues/443) feat(auth): Cloudflare Turnstile on editor login | OPEN | unit, integration, component, e2e-blocking | HTTP integration + unit for guards/helpers | |

## Unit backlog

| Issue | State | Tiers | Test spec | Notes |
| ----- | ----- | ----- | --------- | ----- |
| [#15](https://github.com/uplbtools/room-tba/issues/15) [FEATURE] Add buildings that don't have classrooms, such as | OPEN | unit, integration, component, e2e-blocking | integration/services or integration/http | AMIS, fetch manual only |
| [#31](https://github.com/uplbtools/room-tba/issues/31) [DESIGN] Creating a design system | OPEN | unit, integration, component, e2e-blocking, e2e-advisory | sync-keys/store unit; advisory offline-boot | |
| [#101](https://github.com/uplbtools/room-tba/issues/101) [FEATURE] Communicate offline mode better | OPEN | unit, component, e2e-blocking, e2e-advisory, manual-only | sync-keys/store unit; advisory offline-boot | |
| [#116](https://github.com/uplbtools/room-tba/issues/116) [FEATURE] Crop OSM pbf data and make it available offline | OPEN | unit, component, e2e-blocking, e2e-advisory | sync-keys/store unit; advisory offline-boot | |
| [#117](https://github.com/uplbtools/room-tba/issues/117) Improving data management and syncing | OPEN | unit, component, e2e-blocking, e2e-advisory, manual-only | Fixture JSON unit tests in src/lib/amis or schedule-import | AMIS, fetch manual only |
| [#128](https://github.com/uplbtools/room-tba/issues/128) [FEATURE] Open Graph metadata for entity pages (rooms, build | OPEN | unit, integration, component, e2e-blocking, e2e-advisory, manual-only | HTTP integration + unit for guards/helpers | |
| [#145](https://github.com/uplbtools/room-tba/issues/145) [REFACTOR] Switching to SvelteKit for better seo integration | OPEN | unit, e2e-blocking, e2e-advisory | e2e/browse/entity-seo.spec.ts pattern | |
| [#156](https://github.com/uplbtools/room-tba/issues/156) [FEATURE] Real jeepney route data and map layer | OPEN | unit, integration, component, e2e-blocking, e2e-advisory, manual-only | integration/services or integration/http | |
| [#157](https://github.com/uplbtools/room-tba/issues/157) [FEATURE] Campus gates and entry points | OPEN | unit, integration, component, e2e-blocking, e2e-advisory | integration/services or integration/http | |
| [#158](https://github.com/uplbtools/room-tba/issues/158) [FEATURE] Facilities taxonomy for rooms | OPEN | unit, integration, component, e2e-blocking, e2e-advisory | integration/services or integration/http | |
| [#160](https://github.com/uplbtools/room-tba/issues/160) [FEATURE] Food, study, and service POIs | OPEN | unit, integration, component, e2e-blocking, e2e-advisory | integration/services or integration/http | |
| [#170](https://github.com/uplbtools/room-tba/issues/170) Investigate vector-of-triples representation for 3D building | OPEN | unit, integration, component, e2e-blocking, e2e-advisory, manual-only | integration/services or integration/http | |
| [#191](https://github.com/uplbtools/room-tba/issues/191) [FEATURE] Generalized entity images (buildings, rooms, dorms | OPEN | unit, integration, component, e2e-blocking, e2e-advisory | HTTP integration + unit for guards/helpers | |
| [#202](https://github.com/uplbtools/room-tba/issues/202) [FEATURE] Finalize Google Docs–style editor version history | OPEN | unit, integration, component, e2e-blocking, e2e-advisory, manual-only | HTTP integration + unit for guards/helpers | |
| [#213](https://github.com/uplbtools/room-tba/issues/213) Encourage users to install Room TBA via browser Add to Home | OPEN | unit, integration, component, e2e-blocking, e2e-advisory | sync-keys/store unit; advisory offline-boot | |
| [#214](https://github.com/uplbtools/room-tba/issues/214) Add push notifications pipeline for campus updates and event | OPEN | unit, integration, component, e2e-blocking, e2e-advisory | HTTP integration + unit for guards/helpers | |
| [#228](https://github.com/uplbtools/room-tba/issues/228) [DATA] Publish volunteer DATA issue template and spreadsheet | OPEN | unit, integration | Fixture/import unit test; optional staging data-fidelity smoke | No live AMIS fetch in CI |
| [#230](https://github.com/uplbtools/room-tba/issues/230) [DATA] Unify PGlite schema with Drizzle (codegen init SQL) | OPEN | unit, integration, component, e2e-blocking, e2e-advisory | integration/services or integration/http | |
| [#232](https://github.com/uplbtools/room-tba/issues/232) [DATA] Room pin audit: Batch 1 (50 buildings) | OPEN | unit, integration | Fixture/import unit test; optional staging data-fidelity smoke | No live AMIS fetch in CI |
| [#233](https://github.com/uplbtools/room-tba/issues/233) [DATA] Report wrong room codes via issue template | OPEN | unit, integration | Fixture/import unit test; optional staging data-fidelity smoke | No live AMIS fetch in CI |
| [#234](https://github.com/uplbtools/room-tba/issues/234) [DATA] Verify dorm metadata (10 dorms) | OPEN | unit, integration, e2e-blocking | Fixture/import unit test; optional staging data-fidelity smoke | No live AMIS fetch in CI |
| [#235](https://github.com/uplbtools/room-tba/issues/235) [DATA] Campus events seed list for next term | OPEN | unit, integration, e2e-blocking | Fixture/import unit test; optional staging data-fidelity smoke | No live AMIS fetch in CI |
| [#236](https://github.com/uplbtools/room-tba/issues/236) [QA] Sprint 1 smoke checklist: browse and offline | OPEN | unit, component, e2e-blocking, e2e-advisory | Playwright repro of reporter steps + no pageerror | |
| [#237](https://github.com/uplbtools/room-tba/issues/237) [QA] Sync toast and status bar regression | OPEN | unit, e2e-blocking, e2e-advisory | Playwright repro of reporter steps + no pageerror | |
| [#240](https://github.com/uplbtools/room-tba/issues/240) Theme schedule canvas to Room TBA design tokens | OPEN | unit, e2e-blocking | Default: unit for new lib logic; E2E for user-visible AC | |
| [#242](https://github.com/uplbtools/room-tba/issues/242) [DATA] Verify 20 course codes map to room schedules | OPEN | unit, integration, component, e2e-blocking | Fixture/import unit test; optional staging data-fidelity smoke | No live AMIS fetch in CI; AMIS, fetch manual only |
| [#243](https://github.com/uplbtools/room-tba/issues/243) [DATA] Term calendar dates one-pager | OPEN | unit, integration | Fixture/import unit test; optional staging data-fidelity smoke | No live AMIS fetch in CI |
| [#244](https://github.com/uplbtools/room-tba/issues/244) [DATA] Alias and synonym suggestions spreadsheet | OPEN | unit, integration | Fixture/import unit test; optional staging data-fidelity smoke | No live AMIS fetch in CI |
| [#249](https://github.com/uplbtools/room-tba/issues/249) [DATA] Gate and entry point coordinates spreadsheet | OPEN | unit, integration | Fixture/import unit test; optional staging data-fidelity smoke | No live AMIS fetch in CI |
| [#250](https://github.com/uplbtools/room-tba/issues/250) [DATA] Event images and metadata pack (5 events) | OPEN | unit, integration, e2e-blocking | Fixture/import unit test; optional staging data-fidelity smoke | No live AMIS fetch in CI |
| [#251](https://github.com/uplbtools/room-tba/issues/251) [DATA] College and division blurbs | OPEN | unit, integration | Fixture/import unit test; optional staging data-fidelity smoke | No live AMIS fetch in CI |
| [#252](https://github.com/uplbtools/room-tba/issues/252) [DATA] Buildings without classrooms inventory | OPEN | unit, integration | Fixture/import unit test; optional staging data-fidelity smoke | No live AMIS fetch in CI |
| [#256](https://github.com/uplbtools/room-tba/issues/256) Incremental delta sync for PGlite tables | OPEN | unit, e2e-advisory | sync-keys/store unit; advisory offline-boot | |
| [#258](https://github.com/uplbtools/room-tba/issues/258) [DATA] Campus partner prospect list (10 orgs) | OPEN | unit, integration | Fixture/import unit test; optional staging data-fidelity smoke | No live AMIS fetch in CI |
| [#259](https://github.com/uplbtools/room-tba/issues/259) [DATA] Food and study POI draft pins (15 POIs) | OPEN | unit, integration | Fixture/import unit test; optional staging data-fidelity smoke | No live AMIS fetch in CI |
| [#260](https://github.com/uplbtools/room-tba/issues/260) [DATA] Offline maps test campus zones | OPEN | unit, integration, component, e2e-blocking, e2e-advisory | Fixture/import unit test; optional staging data-fidelity smoke | No live AMIS fetch in CI |
| [#261](https://github.com/uplbtools/room-tba/issues/261) [QA] Offline mode walkthrough | OPEN | unit, e2e-blocking, e2e-advisory | Playwright repro of reporter steps + no pageerror | |
| [#262](https://github.com/uplbtools/room-tba/issues/262) [QA] PWA install screenshots: Android and iOS | OPEN | unit, e2e-blocking, e2e-advisory | Playwright repro of reporter steps + no pageerror | |
| [#264](https://github.com/uplbtools/room-tba/issues/264) Campus partner UI surfaces (labeled placements) | OPEN | unit, e2e-blocking | Default: unit for new lib logic; E2E for user-visible AC | |
| [#266](https://github.com/uplbtools/room-tba/issues/266) [DATA] Launch partner pack (3 partners live) | OPEN | unit, integration | Fixture/import unit test; optional staging data-fidelity smoke | No live AMIS fetch in CI |
| [#269](https://github.com/uplbtools/room-tba/issues/269) [QA] Accessibility quick pass | OPEN | unit, integration, component, e2e-blocking, e2e-advisory | Playwright repro of reporter steps + no pageerror | |
| [#273](https://github.com/uplbtools/room-tba/issues/273) [FEATURE] Entity merge pipeline (rooms ✅; buildings, college | OPEN | unit, integration, e2e-blocking, e2e-advisory | integration/services or integration/http | |
| [#274](https://github.com/uplbtools/room-tba/issues/274) Editor avatars and automatic editor credits in home modal | OPEN | unit, integration, component, e2e-blocking, e2e-advisory | HTTP integration + unit for guards/helpers | |
| [#275](https://github.com/uplbtools/room-tba/issues/275) Automatic dev credits from git commits with editable profile | OPEN | unit, integration, component, e2e-blocking, e2e-advisory | HTTP integration + unit for guards/helpers | |
| [#286](https://github.com/uplbtools/room-tba/issues/286) [DATA] simplify AMIS JSON import into Supabase classes | OPEN | unit, integration, component, e2e-blocking, e2e-advisory | Fixture/import unit test; optional staging data-fidelity smoke | No live AMIS fetch in CI; AMIS, fetch manual only |
| [#287](https://github.com/uplbtools/room-tba/issues/287) [DATA] Quick class refresh when AMIS publishes updated JSON | OPEN | unit, integration, component, e2e-blocking, e2e-advisory, manual-only | Fixture/import unit test; optional staging data-fidelity smoke | No live AMIS fetch in CI; AMIS, fetch manual only |
| [#289](https://github.com/uplbtools/room-tba/issues/289) [INFRA] Separate staging database | OPEN | unit, integration, e2e-blocking, e2e-advisory | HTTP integration + unit for guards/helpers | |
| [#293](https://github.com/uplbtools/room-tba/issues/293) [INFRA] Consolidate editor auth on Supabase | OPEN | unit, integration, component, e2e-blocking | HTTP integration + unit for guards/helpers | |
| [#294](https://github.com/uplbtools/room-tba/issues/294) [CHORE] Remove legacy SQLite deps and sync contributor READM | OPEN | unit, integration, component, e2e-blocking, e2e-advisory | integration/services or integration/http | AMIS, fetch manual only |
| [#295](https://github.com/uplbtools/room-tba/issues/295) [REFACTOR] Split store.svelte.ts into domain modules | OPEN | unit, integration, component, e2e-blocking, e2e-advisory | HTTP integration + unit for guards/helpers | |
| [#300](https://github.com/uplbtools/room-tba/issues/300) [DATA] AMIS facility aliases and TBA room fallback for class | OPEN | unit, integration, component, e2e-blocking | Fixture/import unit test; optional staging data-fidelity smoke | No live AMIS fetch in CI; AMIS, fetch manual only |
| [#310](https://github.com/uplbtools/room-tba/issues/310) [FEATURE] Contributor profile with avatar and social links | OPEN | unit, integration, component, e2e-blocking | HTTP integration + unit for guards/helpers | |
| [#313](https://github.com/uplbtools/room-tba/issues/313) [INFRA] Monitor API and page latency (p95, p99) | OPEN | unit, integration, component, e2e-blocking, e2e-advisory, manual-only | integration/services or integration/http | |
| [#327](https://github.com/uplbtools/room-tba/issues/327) [FEATURE] Final exam schedule viewer | OPEN | unit, integration, component, e2e-blocking, e2e-advisory, manual-only | HTTP integration + unit for guards/helpers | AMIS, fetch manual only |
| [#337](https://github.com/uplbtools/room-tba/issues/337) [UX] Categorized offline downloads (maps, class data, contex | OPEN | unit, integration, component, e2e-blocking, e2e-advisory, manual-only | integration/services or integration/http | AMIS, fetch manual only |
| [#381](https://github.com/uplbtools/room-tba/issues/381) [FEATURE] Dark mode, themes, and Settings tab | OPEN | unit, integration, component, e2e-blocking, e2e-advisory | e2e/advisory/a11y.spec.ts target surface | |
| [#401](https://github.com/uplbtools/room-tba/issues/401) Browse Buildings/Colleges/Divisions chips in search bar don' | OPEN | unit, integration, component, e2e-blocking | Regression: unit for pure logic; E2E for UI repro | |
| [#404](https://github.com/uplbtools/room-tba/issues/404) Jeepney route paths take very long to appear on map | OPEN | unit, component, e2e-blocking, e2e-advisory, manual-only | Regression: unit for pure logic; E2E for UI repro | |
| [#405](https://github.com/uplbtools/room-tba/issues/405) Legal pages: back link looks like plain text; missing spaces | OPEN | unit, e2e-blocking | Regression: unit for pure logic; E2E for UI repro | |
| [#406](https://github.com/uplbtools/room-tba/issues/406) Use Discord and Messenger brand logos for community links | OPEN | unit, e2e-blocking | Default: unit for new lib logic; E2E for user-visible AC | |
| [#408](https://github.com/uplbtools/room-tba/issues/408) [feat] Academic calendar viewer | OPEN | unit, integration, component, e2e-blocking | integration/services or integration/http | AMIS, fetch manual only |
| [#409](https://github.com/uplbtools/room-tba/issues/409) [feat] Classes browser: show LAB sections paired with LEC | OPEN | unit, integration, component, e2e-blocking | HTTP integration + unit for guards/helpers | AMIS, fetch manual only |
| [#410](https://github.com/uplbtools/room-tba/issues/410) [feat] Student FAQ page (incl. where 3D building models come | OPEN | unit, integration, component, e2e-blocking, e2e-advisory, manual-only | HTTP integration + unit for guards/helpers | AMIS, fetch manual only |
| [#412](https://github.com/uplbtools/room-tba/issues/412) Implement cursor pagination for class list API and side-pane | OPEN | unit, integration, component, e2e-blocking, e2e-advisory, manual-only | HTTP integration + unit for guards/helpers | AMIS, fetch manual only |
| [#414](https://github.com/uplbtools/room-tba/issues/414) Whimsical, campus-forward redesign for app loading screen | OPEN | unit, integration, component, e2e-blocking, e2e-advisory, manual-only | sync-keys/store unit; advisory offline-boot | |
| [#415](https://github.com/uplbtools/room-tba/issues/415) Cache-first bootstrap: show all saved offline data immediate | OPEN | unit, integration, component, e2e-blocking, e2e-advisory, manual-only | HTTP integration + unit for guards/helpers | AMIS, fetch manual only |
| [#417](https://github.com/uplbtools/room-tba/issues/417) Improve bottom bar (bottom chrome) layout, hierarchy, and mo | OPEN | unit, integration, component, e2e-blocking, e2e-advisory | integration/services or integration/http | |
| [#418](https://github.com/uplbtools/room-tba/issues/418) [DATA] Import roomless class types (thesis, special problem) | OPEN | unit, integration, component, e2e-blocking, e2e-advisory | integration/services or integration/http | AMIS, fetch manual only |
| [#441](https://github.com/uplbtools/room-tba/issues/441) perf(infra): Cloudflare CDN cache in front of Vercel | OPEN | unit, integration, component, e2e-blocking, e2e-advisory, manual-only | HTTP integration + unit for guards/helpers | |
| [#442](https://github.com/uplbtools/room-tba/issues/442) perf(infra): R2 public CDN domain for event images | OPEN | unit, integration, e2e-blocking | HTTP integration + unit for guards/helpers | |
| [#443](https://github.com/uplbtools/room-tba/issues/443) feat(auth): Cloudflare Turnstile on editor login | OPEN | unit, integration, component, e2e-blocking | HTTP integration + unit for guards/helpers | |

## Component backlog

| Issue | State | Tiers | Test spec | Notes |
| ----- | ----- | ----- | --------- | ----- |
| [#15](https://github.com/uplbtools/room-tba/issues/15) [FEATURE] Add buildings that don't have classrooms, such as | OPEN | unit, integration, component, e2e-blocking | integration/services or integration/http | AMIS, fetch manual only |
| [#31](https://github.com/uplbtools/room-tba/issues/31) [DESIGN] Creating a design system | OPEN | unit, integration, component, e2e-blocking, e2e-advisory | sync-keys/store unit; advisory offline-boot | |
| [#43](https://github.com/uplbtools/room-tba/issues/43) [DESIGN] UI improvement based on design system constraints | OPEN | component, e2e-blocking | Vitest layout @320px + Playwright browse/admin spec | |
| [#94](https://github.com/uplbtools/room-tba/issues/94) [FEATURE] When a route is generated to a building, automatic | OPEN | component, e2e-blocking, e2e-advisory | Vitest layout @320px + Playwright browse/admin spec | |
| [#101](https://github.com/uplbtools/room-tba/issues/101) [FEATURE] Communicate offline mode better | OPEN | unit, component, e2e-blocking, e2e-advisory, manual-only | sync-keys/store unit; advisory offline-boot | |
| [#108](https://github.com/uplbtools/room-tba/issues/108) [FEATURE] Add links to smiliar initiatives | OPEN | component, e2e-blocking | Vitest layout @320px + Playwright browse/admin spec | |
| [#116](https://github.com/uplbtools/room-tba/issues/116) [FEATURE] Crop OSM pbf data and make it available offline | OPEN | unit, component, e2e-blocking, e2e-advisory | sync-keys/store unit; advisory offline-boot | |
| [#117](https://github.com/uplbtools/room-tba/issues/117) Improving data management and syncing | OPEN | unit, component, e2e-blocking, e2e-advisory, manual-only | Fixture JSON unit tests in src/lib/amis or schedule-import | AMIS, fetch manual only |
| [#122](https://github.com/uplbtools/room-tba/issues/122) Include SNODLOB and MSI to Rural Route | OPEN | component, e2e-blocking, e2e-advisory | Vitest layout @320px + Playwright browse/admin spec | |
| [#127](https://github.com/uplbtools/room-tba/issues/127) [FEATURE] Add image to dorm card | OPEN | component, e2e-blocking, e2e-advisory, manual-only | e2e/browse/entity-seo.spec.ts pattern | |
| [#128](https://github.com/uplbtools/room-tba/issues/128) [FEATURE] Open Graph metadata for entity pages (rooms, build | OPEN | unit, integration, component, e2e-blocking, e2e-advisory, manual-only | HTTP integration + unit for guards/helpers | |
| [#156](https://github.com/uplbtools/room-tba/issues/156) [FEATURE] Real jeepney route data and map layer | OPEN | unit, integration, component, e2e-blocking, e2e-advisory, manual-only | integration/services or integration/http | |
| [#157](https://github.com/uplbtools/room-tba/issues/157) [FEATURE] Campus gates and entry points | OPEN | unit, integration, component, e2e-blocking, e2e-advisory | integration/services or integration/http | |
| [#158](https://github.com/uplbtools/room-tba/issues/158) [FEATURE] Facilities taxonomy for rooms | OPEN | unit, integration, component, e2e-blocking, e2e-advisory | integration/services or integration/http | |
| [#160](https://github.com/uplbtools/room-tba/issues/160) [FEATURE] Food, study, and service POIs | OPEN | unit, integration, component, e2e-blocking, e2e-advisory | integration/services or integration/http | |
| [#170](https://github.com/uplbtools/room-tba/issues/170) Investigate vector-of-triples representation for 3D building | OPEN | unit, integration, component, e2e-blocking, e2e-advisory, manual-only | integration/services or integration/http | |
| [#191](https://github.com/uplbtools/room-tba/issues/191) [FEATURE] Generalized entity images (buildings, rooms, dorms | OPEN | unit, integration, component, e2e-blocking, e2e-advisory | HTTP integration + unit for guards/helpers | |
| [#202](https://github.com/uplbtools/room-tba/issues/202) [FEATURE] Finalize Google Docs–style editor version history | OPEN | unit, integration, component, e2e-blocking, e2e-advisory, manual-only | HTTP integration + unit for guards/helpers | |
| [#213](https://github.com/uplbtools/room-tba/issues/213) Encourage users to install Room TBA via browser Add to Home | OPEN | unit, integration, component, e2e-blocking, e2e-advisory | sync-keys/store unit; advisory offline-boot | |
| [#214](https://github.com/uplbtools/room-tba/issues/214) Add push notifications pipeline for campus updates and event | OPEN | unit, integration, component, e2e-blocking, e2e-advisory | HTTP integration + unit for guards/helpers | |
| [#227](https://github.com/uplbtools/room-tba/issues/227) Rich proposal diffs in editor review queue (#208, #202 follo | OPEN | integration, component, e2e-blocking | integration/services or integration/http | |
| [#230](https://github.com/uplbtools/room-tba/issues/230) [DATA] Unify PGlite schema with Drizzle (codegen init SQL) | OPEN | unit, integration, component, e2e-blocking, e2e-advisory | integration/services or integration/http | |
| [#236](https://github.com/uplbtools/room-tba/issues/236) [QA] Sprint 1 smoke checklist: browse and offline | OPEN | unit, component, e2e-blocking, e2e-advisory | Playwright repro of reporter steps + no pageerror | |
| [#241](https://github.com/uplbtools/room-tba/issues/241) Mobile schedule UX pass (320px) | OPEN | component, e2e-blocking | Vitest layout @320px + Playwright browse/admin spec | |
| [#242](https://github.com/uplbtools/room-tba/issues/242) [DATA] Verify 20 course codes map to room schedules | OPEN | unit, integration, component, e2e-blocking | Fixture/import unit test; optional staging data-fidelity smoke | No live AMIS fetch in CI; AMIS, fetch manual only |
| [#246](https://github.com/uplbtools/room-tba/issues/246) [QA] Class search empty and error states | OPEN | component, e2e-blocking | Playwright repro of reporter steps + no pageerror | |
| [#247](https://github.com/uplbtools/room-tba/issues/247) [QA] Visual pass: schedule matches map chrome | OPEN | component, e2e-blocking | Playwright repro of reporter steps + no pageerror | |
| [#254](https://github.com/uplbtools/room-tba/issues/254) [QA] Events list and map focus pass | OPEN | component, e2e-blocking | Playwright repro of reporter steps + no pageerror | |
| [#260](https://github.com/uplbtools/room-tba/issues/260) [DATA] Offline maps test campus zones | OPEN | unit, integration, component, e2e-blocking, e2e-advisory | Fixture/import unit test; optional staging data-fidelity smoke | No live AMIS fetch in CI |
| [#269](https://github.com/uplbtools/room-tba/issues/269) [QA] Accessibility quick pass | OPEN | unit, integration, component, e2e-blocking, e2e-advisory | Playwright repro of reporter steps + no pageerror | |
| [#274](https://github.com/uplbtools/room-tba/issues/274) Editor avatars and automatic editor credits in home modal | OPEN | unit, integration, component, e2e-blocking, e2e-advisory | HTTP integration + unit for guards/helpers | |
| [#275](https://github.com/uplbtools/room-tba/issues/275) Automatic dev credits from git commits with editable profile | OPEN | unit, integration, component, e2e-blocking, e2e-advisory | HTTP integration + unit for guards/helpers | |
| [#286](https://github.com/uplbtools/room-tba/issues/286) [DATA] simplify AMIS JSON import into Supabase classes | OPEN | unit, integration, component, e2e-blocking, e2e-advisory | Fixture/import unit test; optional staging data-fidelity smoke | No live AMIS fetch in CI; AMIS, fetch manual only |
| [#287](https://github.com/uplbtools/room-tba/issues/287) [DATA] Quick class refresh when AMIS publishes updated JSON | OPEN | unit, integration, component, e2e-blocking, e2e-advisory, manual-only | Fixture/import unit test; optional staging data-fidelity smoke | No live AMIS fetch in CI; AMIS, fetch manual only |
| [#293](https://github.com/uplbtools/room-tba/issues/293) [INFRA] Consolidate editor auth on Supabase | OPEN | unit, integration, component, e2e-blocking | HTTP integration + unit for guards/helpers | |
| [#294](https://github.com/uplbtools/room-tba/issues/294) [CHORE] Remove legacy SQLite deps and sync contributor READM | OPEN | unit, integration, component, e2e-blocking, e2e-advisory | integration/services or integration/http | AMIS, fetch manual only |
| [#295](https://github.com/uplbtools/room-tba/issues/295) [REFACTOR] Split store.svelte.ts into domain modules | OPEN | unit, integration, component, e2e-blocking, e2e-advisory | HTTP integration + unit for guards/helpers | |
| [#300](https://github.com/uplbtools/room-tba/issues/300) [DATA] AMIS facility aliases and TBA room fallback for class | OPEN | unit, integration, component, e2e-blocking | Fixture/import unit test; optional staging data-fidelity smoke | No live AMIS fetch in CI; AMIS, fetch manual only |
| [#310](https://github.com/uplbtools/room-tba/issues/310) [FEATURE] Contributor profile with avatar and social links | OPEN | unit, integration, component, e2e-blocking | HTTP integration + unit for guards/helpers | |
| [#313](https://github.com/uplbtools/room-tba/issues/313) [INFRA] Monitor API and page latency (p95, p99) | OPEN | unit, integration, component, e2e-blocking, e2e-advisory, manual-only | integration/services or integration/http | |
| [#327](https://github.com/uplbtools/room-tba/issues/327) [FEATURE] Final exam schedule viewer | OPEN | unit, integration, component, e2e-blocking, e2e-advisory, manual-only | HTTP integration + unit for guards/helpers | AMIS, fetch manual only |
| [#337](https://github.com/uplbtools/room-tba/issues/337) [UX] Categorized offline downloads (maps, class data, contex | OPEN | unit, integration, component, e2e-blocking, e2e-advisory, manual-only | integration/services or integration/http | AMIS, fetch manual only |
| [#381](https://github.com/uplbtools/room-tba/issues/381) [FEATURE] Dark mode, themes, and Settings tab | OPEN | unit, integration, component, e2e-blocking, e2e-advisory | e2e/advisory/a11y.spec.ts target surface | |
| [#401](https://github.com/uplbtools/room-tba/issues/401) Browse Buildings/Colleges/Divisions chips in search bar don' | OPEN | unit, integration, component, e2e-blocking | Regression: unit for pure logic; E2E for UI repro | |
| [#404](https://github.com/uplbtools/room-tba/issues/404) Jeepney route paths take very long to appear on map | OPEN | unit, component, e2e-blocking, e2e-advisory, manual-only | Regression: unit for pure logic; E2E for UI repro | |
| [#408](https://github.com/uplbtools/room-tba/issues/408) [feat] Academic calendar viewer | OPEN | unit, integration, component, e2e-blocking | integration/services or integration/http | AMIS, fetch manual only |
| [#409](https://github.com/uplbtools/room-tba/issues/409) [feat] Classes browser: show LAB sections paired with LEC | OPEN | unit, integration, component, e2e-blocking | HTTP integration + unit for guards/helpers | AMIS, fetch manual only |
| [#410](https://github.com/uplbtools/room-tba/issues/410) [feat] Student FAQ page (incl. where 3D building models come | OPEN | unit, integration, component, e2e-blocking, e2e-advisory, manual-only | HTTP integration + unit for guards/helpers | AMIS, fetch manual only |
| [#411](https://github.com/uplbtools/room-tba/issues/411) Mobile detail sheet: Google Maps–style drag, slimmer handle, | OPEN | component, e2e-blocking, e2e-advisory | e2e/advisory/a11y.spec.ts target surface | |
| [#412](https://github.com/uplbtools/room-tba/issues/412) Implement cursor pagination for class list API and side-pane | OPEN | unit, integration, component, e2e-blocking, e2e-advisory, manual-only | HTTP integration + unit for guards/helpers | AMIS, fetch manual only |
| [#413](https://github.com/uplbtools/room-tba/issues/413) Uniform scrollbar styling in modals (and shared scroll regio | OPEN | integration, component, e2e-blocking | Vitest layout @320px + Playwright browse/admin spec | |
| [#414](https://github.com/uplbtools/room-tba/issues/414) Whimsical, campus-forward redesign for app loading screen | OPEN | unit, integration, component, e2e-blocking, e2e-advisory, manual-only | sync-keys/store unit; advisory offline-boot | |
| [#415](https://github.com/uplbtools/room-tba/issues/415) Cache-first bootstrap: show all saved offline data immediate | OPEN | unit, integration, component, e2e-blocking, e2e-advisory, manual-only | HTTP integration + unit for guards/helpers | AMIS, fetch manual only |
| [#416](https://github.com/uplbtools/room-tba/issues/416) Shared EntityExternalLink component for uniform off-site lin | OPEN | component, e2e-blocking, e2e-advisory | e2e/advisory/a11y.spec.ts target surface | |
| [#417](https://github.com/uplbtools/room-tba/issues/417) Improve bottom bar (bottom chrome) layout, hierarchy, and mo | OPEN | unit, integration, component, e2e-blocking, e2e-advisory | integration/services or integration/http | |
| [#418](https://github.com/uplbtools/room-tba/issues/418) [DATA] Import roomless class types (thesis, special problem) | OPEN | unit, integration, component, e2e-blocking, e2e-advisory | integration/services or integration/http | AMIS, fetch manual only |
| [#424](https://github.com/uplbtools/room-tba/issues/424) Side panel collapse tab looks stacked on the drawer, not par | OPEN | component, e2e-blocking, e2e-advisory | e2e/advisory/a11y.spec.ts target surface | |
| [#426](https://github.com/uplbtools/room-tba/issues/426) Entity edit / suggest forms: text too small and low contrast | OPEN | integration, component, e2e-blocking, e2e-advisory | e2e/advisory/a11y.spec.ts target surface | |
| [#427](https://github.com/uplbtools/room-tba/issues/427) Side panel empty states: more whimsical, campus-forward visu | OPEN | integration, component, e2e-blocking, e2e-advisory, manual-only | integration/services or integration/http | |
| [#441](https://github.com/uplbtools/room-tba/issues/441) perf(infra): Cloudflare CDN cache in front of Vercel | OPEN | unit, integration, component, e2e-blocking, e2e-advisory, manual-only | HTTP integration + unit for guards/helpers | |
| [#443](https://github.com/uplbtools/room-tba/issues/443) feat(auth): Cloudflare Turnstile on editor login | OPEN | unit, integration, component, e2e-blocking | HTTP integration + unit for guards/helpers | |

## Advisory backlog

| Issue | State | Tiers | Test spec | Notes |
| ----- | ----- | ----- | --------- | ----- |
| [#31](https://github.com/uplbtools/room-tba/issues/31) [DESIGN] Creating a design system | OPEN | unit, integration, component, e2e-blocking, e2e-advisory | sync-keys/store unit; advisory offline-boot | |
| [#94](https://github.com/uplbtools/room-tba/issues/94) [FEATURE] When a route is generated to a building, automatic | OPEN | component, e2e-blocking, e2e-advisory | Vitest layout @320px + Playwright browse/admin spec | |
| [#101](https://github.com/uplbtools/room-tba/issues/101) [FEATURE] Communicate offline mode better | OPEN | unit, component, e2e-blocking, e2e-advisory, manual-only | sync-keys/store unit; advisory offline-boot | |
| [#109](https://github.com/uplbtools/room-tba/issues/109) re: 3D models, is the 3D model of a building stricltly 2.5D, | OPEN | e2e-advisory, manual-only | check:bundle advisory; manual timing on staging | |
| [#116](https://github.com/uplbtools/room-tba/issues/116) [FEATURE] Crop OSM pbf data and make it available offline | OPEN | unit, component, e2e-blocking, e2e-advisory | sync-keys/store unit; advisory offline-boot | |
| [#117](https://github.com/uplbtools/room-tba/issues/117) Improving data management and syncing | OPEN | unit, component, e2e-blocking, e2e-advisory, manual-only | Fixture JSON unit tests in src/lib/amis or schedule-import | AMIS, fetch manual only |
| [#122](https://github.com/uplbtools/room-tba/issues/122) Include SNODLOB and MSI to Rural Route | OPEN | component, e2e-blocking, e2e-advisory | Vitest layout @320px + Playwright browse/admin spec | |
| [#127](https://github.com/uplbtools/room-tba/issues/127) [FEATURE] Add image to dorm card | OPEN | component, e2e-blocking, e2e-advisory, manual-only | e2e/browse/entity-seo.spec.ts pattern | |
| [#128](https://github.com/uplbtools/room-tba/issues/128) [FEATURE] Open Graph metadata for entity pages (rooms, build | OPEN | unit, integration, component, e2e-blocking, e2e-advisory, manual-only | HTTP integration + unit for guards/helpers | |
| [#145](https://github.com/uplbtools/room-tba/issues/145) [REFACTOR] Switching to SvelteKit for better seo integration | OPEN | unit, e2e-blocking, e2e-advisory | e2e/browse/entity-seo.spec.ts pattern | |
| [#156](https://github.com/uplbtools/room-tba/issues/156) [FEATURE] Real jeepney route data and map layer | OPEN | unit, integration, component, e2e-blocking, e2e-advisory, manual-only | integration/services or integration/http | |
| [#157](https://github.com/uplbtools/room-tba/issues/157) [FEATURE] Campus gates and entry points | OPEN | unit, integration, component, e2e-blocking, e2e-advisory | integration/services or integration/http | |
| [#158](https://github.com/uplbtools/room-tba/issues/158) [FEATURE] Facilities taxonomy for rooms | OPEN | unit, integration, component, e2e-blocking, e2e-advisory | integration/services or integration/http | |
| [#160](https://github.com/uplbtools/room-tba/issues/160) [FEATURE] Food, study, and service POIs | OPEN | unit, integration, component, e2e-blocking, e2e-advisory | integration/services or integration/http | |
| [#170](https://github.com/uplbtools/room-tba/issues/170) Investigate vector-of-triples representation for 3D building | OPEN | unit, integration, component, e2e-blocking, e2e-advisory, manual-only | integration/services or integration/http | |
| [#191](https://github.com/uplbtools/room-tba/issues/191) [FEATURE] Generalized entity images (buildings, rooms, dorms | OPEN | unit, integration, component, e2e-blocking, e2e-advisory | HTTP integration + unit for guards/helpers | |
| [#202](https://github.com/uplbtools/room-tba/issues/202) [FEATURE] Finalize Google Docs–style editor version history | OPEN | unit, integration, component, e2e-blocking, e2e-advisory, manual-only | HTTP integration + unit for guards/helpers | |
| [#213](https://github.com/uplbtools/room-tba/issues/213) Encourage users to install Room TBA via browser Add to Home | OPEN | unit, integration, component, e2e-blocking, e2e-advisory | sync-keys/store unit; advisory offline-boot | |
| [#214](https://github.com/uplbtools/room-tba/issues/214) Add push notifications pipeline for campus updates and event | OPEN | unit, integration, component, e2e-blocking, e2e-advisory | HTTP integration + unit for guards/helpers | |
| [#230](https://github.com/uplbtools/room-tba/issues/230) [DATA] Unify PGlite schema with Drizzle (codegen init SQL) | OPEN | unit, integration, component, e2e-blocking, e2e-advisory | integration/services or integration/http | |
| [#236](https://github.com/uplbtools/room-tba/issues/236) [QA] Sprint 1 smoke checklist: browse and offline | OPEN | unit, component, e2e-blocking, e2e-advisory | Playwright repro of reporter steps + no pageerror | |
| [#237](https://github.com/uplbtools/room-tba/issues/237) [QA] Sync toast and status bar regression | OPEN | unit, e2e-blocking, e2e-advisory | Playwright repro of reporter steps + no pageerror | |
| [#256](https://github.com/uplbtools/room-tba/issues/256) Incremental delta sync for PGlite tables | OPEN | unit, e2e-advisory | sync-keys/store unit; advisory offline-boot | |
| [#260](https://github.com/uplbtools/room-tba/issues/260) [DATA] Offline maps test campus zones | OPEN | unit, integration, component, e2e-blocking, e2e-advisory | Fixture/import unit test; optional staging data-fidelity smoke | No live AMIS fetch in CI |
| [#261](https://github.com/uplbtools/room-tba/issues/261) [QA] Offline mode walkthrough | OPEN | unit, e2e-blocking, e2e-advisory | Playwright repro of reporter steps + no pageerror | |
| [#262](https://github.com/uplbtools/room-tba/issues/262) [QA] PWA install screenshots: Android and iOS | OPEN | unit, e2e-blocking, e2e-advisory | Playwright repro of reporter steps + no pageerror | |
| [#263](https://github.com/uplbtools/room-tba/issues/263) [QA] Performance spot-check (3 devices) | OPEN | e2e-blocking, e2e-advisory, manual-only | Playwright repro of reporter steps + no pageerror | |
| [#269](https://github.com/uplbtools/room-tba/issues/269) [QA] Accessibility quick pass | OPEN | unit, integration, component, e2e-blocking, e2e-advisory | Playwright repro of reporter steps + no pageerror | |
| [#273](https://github.com/uplbtools/room-tba/issues/273) [FEATURE] Entity merge pipeline (rooms ✅; buildings, college | OPEN | unit, integration, e2e-blocking, e2e-advisory | integration/services or integration/http | |
| [#274](https://github.com/uplbtools/room-tba/issues/274) Editor avatars and automatic editor credits in home modal | OPEN | unit, integration, component, e2e-blocking, e2e-advisory | HTTP integration + unit for guards/helpers | |
| [#275](https://github.com/uplbtools/room-tba/issues/275) Automatic dev credits from git commits with editable profile | OPEN | unit, integration, component, e2e-blocking, e2e-advisory | HTTP integration + unit for guards/helpers | |
| [#286](https://github.com/uplbtools/room-tba/issues/286) [DATA] simplify AMIS JSON import into Supabase classes | OPEN | unit, integration, component, e2e-blocking, e2e-advisory | Fixture/import unit test; optional staging data-fidelity smoke | No live AMIS fetch in CI; AMIS, fetch manual only |
| [#287](https://github.com/uplbtools/room-tba/issues/287) [DATA] Quick class refresh when AMIS publishes updated JSON | OPEN | unit, integration, component, e2e-blocking, e2e-advisory, manual-only | Fixture/import unit test; optional staging data-fidelity smoke | No live AMIS fetch in CI; AMIS, fetch manual only |
| [#289](https://github.com/uplbtools/room-tba/issues/289) [INFRA] Separate staging database | OPEN | unit, integration, e2e-blocking, e2e-advisory | HTTP integration + unit for guards/helpers | |
| [#294](https://github.com/uplbtools/room-tba/issues/294) [CHORE] Remove legacy SQLite deps and sync contributor READM | OPEN | unit, integration, component, e2e-blocking, e2e-advisory | integration/services or integration/http | AMIS, fetch manual only |
| [#295](https://github.com/uplbtools/room-tba/issues/295) [REFACTOR] Split store.svelte.ts into domain modules | OPEN | unit, integration, component, e2e-blocking, e2e-advisory | HTTP integration + unit for guards/helpers | |
| [#313](https://github.com/uplbtools/room-tba/issues/313) [INFRA] Monitor API and page latency (p95, p99) | OPEN | unit, integration, component, e2e-blocking, e2e-advisory, manual-only | integration/services or integration/http | |
| [#327](https://github.com/uplbtools/room-tba/issues/327) [FEATURE] Final exam schedule viewer | OPEN | unit, integration, component, e2e-blocking, e2e-advisory, manual-only | HTTP integration + unit for guards/helpers | AMIS, fetch manual only |
| [#337](https://github.com/uplbtools/room-tba/issues/337) [UX] Categorized offline downloads (maps, class data, contex | OPEN | unit, integration, component, e2e-blocking, e2e-advisory, manual-only | integration/services or integration/http | AMIS, fetch manual only |
| [#381](https://github.com/uplbtools/room-tba/issues/381) [FEATURE] Dark mode, themes, and Settings tab | OPEN | unit, integration, component, e2e-blocking, e2e-advisory | e2e/advisory/a11y.spec.ts target surface | |
| [#404](https://github.com/uplbtools/room-tba/issues/404) Jeepney route paths take very long to appear on map | OPEN | unit, component, e2e-blocking, e2e-advisory, manual-only | Regression: unit for pure logic; E2E for UI repro | |
| [#410](https://github.com/uplbtools/room-tba/issues/410) [feat] Student FAQ page (incl. where 3D building models come | OPEN | unit, integration, component, e2e-blocking, e2e-advisory, manual-only | HTTP integration + unit for guards/helpers | AMIS, fetch manual only |
| [#411](https://github.com/uplbtools/room-tba/issues/411) Mobile detail sheet: Google Maps–style drag, slimmer handle, | OPEN | component, e2e-blocking, e2e-advisory | e2e/advisory/a11y.spec.ts target surface | |
| [#412](https://github.com/uplbtools/room-tba/issues/412) Implement cursor pagination for class list API and side-pane | OPEN | unit, integration, component, e2e-blocking, e2e-advisory, manual-only | HTTP integration + unit for guards/helpers | AMIS, fetch manual only |
| [#414](https://github.com/uplbtools/room-tba/issues/414) Whimsical, campus-forward redesign for app loading screen | OPEN | unit, integration, component, e2e-blocking, e2e-advisory, manual-only | sync-keys/store unit; advisory offline-boot | |
| [#415](https://github.com/uplbtools/room-tba/issues/415) Cache-first bootstrap: show all saved offline data immediate | OPEN | unit, integration, component, e2e-blocking, e2e-advisory, manual-only | HTTP integration + unit for guards/helpers | AMIS, fetch manual only |
| [#416](https://github.com/uplbtools/room-tba/issues/416) Shared EntityExternalLink component for uniform off-site lin | OPEN | component, e2e-blocking, e2e-advisory | e2e/advisory/a11y.spec.ts target surface | |
| [#417](https://github.com/uplbtools/room-tba/issues/417) Improve bottom bar (bottom chrome) layout, hierarchy, and mo | OPEN | unit, integration, component, e2e-blocking, e2e-advisory | integration/services or integration/http | |
| [#418](https://github.com/uplbtools/room-tba/issues/418) [DATA] Import roomless class types (thesis, special problem) | OPEN | unit, integration, component, e2e-blocking, e2e-advisory | integration/services or integration/http | AMIS, fetch manual only |
| [#424](https://github.com/uplbtools/room-tba/issues/424) Side panel collapse tab looks stacked on the drawer, not par | OPEN | component, e2e-blocking, e2e-advisory | e2e/advisory/a11y.spec.ts target surface | |
| [#426](https://github.com/uplbtools/room-tba/issues/426) Entity edit / suggest forms: text too small and low contrast | OPEN | integration, component, e2e-blocking, e2e-advisory | e2e/advisory/a11y.spec.ts target surface | |
| [#427](https://github.com/uplbtools/room-tba/issues/427) Side panel empty states: more whimsical, campus-forward visu | OPEN | integration, component, e2e-blocking, e2e-advisory, manual-only | integration/services or integration/http | |
| [#441](https://github.com/uplbtools/room-tba/issues/441) perf(infra): Cloudflare CDN cache in front of Vercel | OPEN | unit, integration, component, e2e-blocking, e2e-advisory, manual-only | HTTP integration + unit for guards/helpers | |

## Full open issue index

| Issue | Labels | Tiers | Test spec |
| ----- | ------ | ----- | --------- |
| [#15](https://github.com/uplbtools/room-tba/issues/15) | enhancement, size/M, priority/medium | unit, integration, component, e2e-blocking | integration/services or integration/http |
| [#31](https://github.com/uplbtools/room-tba/issues/31) | documentation, design improvement, size/XL, priority/low | unit, integration, component, e2e-blocking, e2e-advisory | sync-keys/store unit; advisory offline-boot |
| [#39](https://github.com/uplbtools/room-tba/issues/39) | size/S, priority/medium | manual-only | Human coordination checklist |
| [#43](https://github.com/uplbtools/room-tba/issues/43) | design improvement, size/L, priority/medium | component, e2e-blocking | Vitest layout @320px + Playwright browse/admin spec |
| [#94](https://github.com/uplbtools/room-tba/issues/94) | size/XS, priority/medium | component, e2e-blocking, e2e-advisory | Vitest layout @320px + Playwright browse/admin spec |
| [#98](https://github.com/uplbtools/room-tba/issues/98) | size/M, priority/medium | manual-only | Human coordination checklist |
| [#101](https://github.com/uplbtools/room-tba/issues/101) | size/S, priority/medium | unit, component, e2e-blocking, e2e-advisory, manual-only | sync-keys/store unit; advisory offline-boot |
| [#108](https://github.com/uplbtools/room-tba/issues/108) | good first issue, released, size/XS, priority/medium | component, e2e-blocking | Vitest layout @320px + Playwright browse/admin spec |
| [#109](https://github.com/uplbtools/room-tba/issues/109) | size/XS, priority/medium | e2e-advisory, manual-only | check:bundle advisory; manual timing on staging |
| [#115](https://github.com/uplbtools/room-tba/issues/115) | size/XL, priority/low | manual-only | Human coordination checklist |
| [#116](https://github.com/uplbtools/room-tba/issues/116) | size/L, priority/medium | unit, component, e2e-blocking, e2e-advisory | sync-keys/store unit; advisory offline-boot |
| [#117](https://github.com/uplbtools/room-tba/issues/117) | size/L, priority/medium | unit, component, e2e-blocking, e2e-advisory, manual-only | Fixture JSON unit tests in src/lib/amis or schedule-import |
| [#122](https://github.com/uplbtools/room-tba/issues/122) | size/XS, priority/medium | component, e2e-blocking, e2e-advisory | Vitest layout @320px + Playwright browse/admin spec |
| [#127](https://github.com/uplbtools/room-tba/issues/127) | good first issue, size/XS, priority/medium | component, e2e-blocking, e2e-advisory, manual-only | e2e/browse/entity-seo.spec.ts pattern |
| [#128](https://github.com/uplbtools/room-tba/issues/128) | size/M, priority/medium | unit, integration, component, e2e-blocking, e2e-advisory, manual-only | HTTP integration + unit for guards/helpers |
| [#142](https://github.com/uplbtools/room-tba/issues/142) | documentation, good first issue, first read, size/XS | e2e-blocking | Default: at least one automated test for acceptance criteria |
| [#145](https://github.com/uplbtools/room-tba/issues/145) | size/XL, priority/low | unit, e2e-blocking, e2e-advisory | e2e/browse/entity-seo.spec.ts pattern |
| [#146](https://github.com/uplbtools/room-tba/issues/146) | size/S, priority/medium | e2e-blocking | Default: at least one automated test for acceptance criteria |
| [#149](https://github.com/uplbtools/room-tba/issues/149) | size/S, priority/medium | none | CI/tooling change only |
| [#152](https://github.com/uplbtools/room-tba/issues/152) | size/M, priority/medium | integration, e2e-blocking | e2e/admin/* + integration 409/version |
| [#156](https://github.com/uplbtools/room-tba/issues/156) | enhancement, size/XL, priority/low | unit, integration, component, e2e-blocking, e2e-advisory, manual-only | integration/services or integration/http |
| [#157](https://github.com/uplbtools/room-tba/issues/157) | enhancement, size/L, priority/medium | unit, integration, component, e2e-blocking, e2e-advisory | integration/services or integration/http |
| [#158](https://github.com/uplbtools/room-tba/issues/158) | enhancement, size/L, priority/medium | unit, integration, component, e2e-blocking, e2e-advisory | integration/services or integration/http |
| [#160](https://github.com/uplbtools/room-tba/issues/160) | enhancement, size/L, priority/medium | unit, integration, component, e2e-blocking, e2e-advisory | integration/services or integration/http |
| [#170](https://github.com/uplbtools/room-tba/issues/170) | size/M, priority/medium | unit, integration, component, e2e-blocking, e2e-advisory, manual-only | integration/services or integration/http |
| [#191](https://github.com/uplbtools/room-tba/issues/191) | size/L, priority/medium | unit, integration, component, e2e-blocking, e2e-advisory | HTTP integration + unit for guards/helpers |
| [#202](https://github.com/uplbtools/room-tba/issues/202) | enhancement, size/L, priority/medium | unit, integration, component, e2e-blocking, e2e-advisory, manual-only | HTTP integration + unit for guards/helpers |
| [#206](https://github.com/uplbtools/room-tba/issues/206) | size/XL, priority/low | manual-only | Human coordination checklist |
| [#213](https://github.com/uplbtools/room-tba/issues/213) | enhancement, size/S, priority/medium | unit, integration, component, e2e-blocking, e2e-advisory | sync-keys/store unit; advisory offline-boot |
| [#214](https://github.com/uplbtools/room-tba/issues/214) | enhancement, size/L, priority/medium | unit, integration, component, e2e-blocking, e2e-advisory | HTTP integration + unit for guards/helpers |
| [#217](https://github.com/uplbtools/room-tba/issues/217) | documentation, parent issue, size/XL, priority/low | none | Roll up from linked sub-issues |
| [#218](https://github.com/uplbtools/room-tba/issues/218) | enhancement, parent issue, size/XL, priority/low | none | Roll up from linked sub-issues |
| [#219](https://github.com/uplbtools/room-tba/issues/219) | enhancement, parent issue, size/XL, priority/low | none | Roll up from linked sub-issues |
| [#220](https://github.com/uplbtools/room-tba/issues/220) | enhancement, parent issue, size/XL, priority/low | none | Roll up from linked sub-issues |
| [#221](https://github.com/uplbtools/room-tba/issues/221) | enhancement, parent issue, size/XL, priority/low | none | Roll up from linked sub-issues |
| [#222](https://github.com/uplbtools/room-tba/issues/222) | size/M, priority/low | manual-only | Human coordination checklist |
| [#223](https://github.com/uplbtools/room-tba/issues/223) | size/M, priority/low | manual-only | Human coordination checklist |
| [#224](https://github.com/uplbtools/room-tba/issues/224) | enhancement, parent issue, size/XL, priority/low | none | Roll up from linked sub-issues |
| [#225](https://github.com/uplbtools/room-tba/issues/225) | size/XL, priority/low | manual-only | Human coordination checklist |
| [#226](https://github.com/uplbtools/room-tba/issues/226) | documentation, good first issue, qa, sub-issue | e2e-blocking | Playwright repro of reporter steps + no pageerror |
| [#227](https://github.com/uplbtools/room-tba/issues/227) | size/L, priority/low | integration, component, e2e-blocking | integration/services or integration/http |
| [#228](https://github.com/uplbtools/room-tba/issues/228) | documentation, good first issue, data, sub-issue | unit, integration | Fixture/import unit test; optional staging data-fidelity smoke |
| [#230](https://github.com/uplbtools/room-tba/issues/230) | enhancement, sub-issue, size/L, priority/medium | unit, integration, component, e2e-blocking, e2e-advisory | integration/services or integration/http |
| [#232](https://github.com/uplbtools/room-tba/issues/232) | good first issue, data, sub-issue, size/M | unit, integration | Fixture/import unit test; optional staging data-fidelity smoke |
| [#233](https://github.com/uplbtools/room-tba/issues/233) | good first issue, data, sub-issue, size/XS | unit, integration | Fixture/import unit test; optional staging data-fidelity smoke |
| [#234](https://github.com/uplbtools/room-tba/issues/234) | good first issue, data, sub-issue, size/XS | unit, integration, e2e-blocking | Fixture/import unit test; optional staging data-fidelity smoke |
| [#235](https://github.com/uplbtools/room-tba/issues/235) | data, sub-issue, size/S, priority/medium | unit, integration, e2e-blocking | Fixture/import unit test; optional staging data-fidelity smoke |
| [#236](https://github.com/uplbtools/room-tba/issues/236) | good first issue, qa, sub-issue, size/XS | unit, component, e2e-blocking, e2e-advisory | Playwright repro of reporter steps + no pageerror |
| [#237](https://github.com/uplbtools/room-tba/issues/237) | good first issue, qa, sub-issue, size/XS | unit, e2e-blocking, e2e-advisory | Playwright repro of reporter steps + no pageerror |
| [#238](https://github.com/uplbtools/room-tba/issues/238) | qa, sub-issue, size/S, priority/medium | integration, e2e-blocking | Playwright repro of reporter steps + no pageerror |
| [#240](https://github.com/uplbtools/room-tba/issues/240) | enhancement, design improvement, sub-issue, size/S | unit, e2e-blocking | Default: unit for new lib logic; E2E for user-visible AC |
| [#241](https://github.com/uplbtools/room-tba/issues/241) | enhancement, sub-issue, size/M, priority/medium | component, e2e-blocking | Vitest layout @320px + Playwright browse/admin spec |
| [#242](https://github.com/uplbtools/room-tba/issues/242) | good first issue, data, sub-issue, size/XS | unit, integration, component, e2e-blocking | Fixture/import unit test; optional staging data-fidelity smoke |
| [#243](https://github.com/uplbtools/room-tba/issues/243) | documentation, good first issue, data, sub-issue | unit, integration | Fixture/import unit test; optional staging data-fidelity smoke |
| [#244](https://github.com/uplbtools/room-tba/issues/244) | good first issue, data, sub-issue, size/XS | unit, integration | Fixture/import unit test; optional staging data-fidelity smoke |
| [#245](https://github.com/uplbtools/room-tba/issues/245) | good first issue, qa, sub-issue, size/S | e2e-blocking | Playwright repro of reporter steps + no pageerror |
| [#246](https://github.com/uplbtools/room-tba/issues/246) | good first issue, qa, sub-issue, size/XS | component, e2e-blocking | Playwright repro of reporter steps + no pageerror |
| [#247](https://github.com/uplbtools/room-tba/issues/247) | design improvement, qa, sub-issue, size/S | component, e2e-blocking | Playwright repro of reporter steps + no pageerror |
| [#248](https://github.com/uplbtools/room-tba/issues/248) | enhancement, sub-issue, size/L, priority/medium | e2e-blocking | e2e/browse/entity-seo.spec.ts pattern |
| [#249](https://github.com/uplbtools/room-tba/issues/249) | good first issue, data, sub-issue, size/XS | unit, integration | Fixture/import unit test; optional staging data-fidelity smoke |
| [#250](https://github.com/uplbtools/room-tba/issues/250) | good first issue, data, sub-issue, size/XS | unit, integration, e2e-blocking | Fixture/import unit test; optional staging data-fidelity smoke |
| [#251](https://github.com/uplbtools/room-tba/issues/251) | good first issue, data, sub-issue, size/XS | unit, integration | Fixture/import unit test; optional staging data-fidelity smoke |
| [#252](https://github.com/uplbtools/room-tba/issues/252) | good first issue, data, sub-issue, size/XS | unit, integration | Fixture/import unit test; optional staging data-fidelity smoke |
| [#253](https://github.com/uplbtools/room-tba/issues/253) | qa, sub-issue, size/M, priority/medium | integration, e2e-blocking | Playwright repro of reporter steps + no pageerror |
| [#254](https://github.com/uplbtools/room-tba/issues/254) | good first issue, qa, sub-issue, size/XS | component, e2e-blocking | Playwright repro of reporter steps + no pageerror |
| [#255](https://github.com/uplbtools/room-tba/issues/255) | qa, sub-issue, size/S, priority/medium | integration, e2e-blocking | Playwright repro of reporter steps + no pageerror |
| [#256](https://github.com/uplbtools/room-tba/issues/256) | enhancement, performance improvement, sub-issue, size/L | unit, e2e-advisory | sync-keys/store unit; advisory offline-boot |
| [#257](https://github.com/uplbtools/room-tba/issues/257) | enhancement, sub-issue, size/L, priority/medium | manual-only | Human coordination checklist |
| [#258](https://github.com/uplbtools/room-tba/issues/258) | good first issue, data, sub-issue, size/XS | unit, integration | Fixture/import unit test; optional staging data-fidelity smoke |
| [#259](https://github.com/uplbtools/room-tba/issues/259) | good first issue, data, sub-issue, size/S | unit, integration | Fixture/import unit test; optional staging data-fidelity smoke |
| [#260](https://github.com/uplbtools/room-tba/issues/260) | good first issue, data, sub-issue, size/M | unit, integration, component, e2e-blocking, e2e-advisory | Fixture/import unit test; optional staging data-fidelity smoke |
| [#261](https://github.com/uplbtools/room-tba/issues/261) | good first issue, qa, sub-issue, size/XS | unit, e2e-blocking, e2e-advisory | Playwright repro of reporter steps + no pageerror |
| [#262](https://github.com/uplbtools/room-tba/issues/262) | good first issue, qa, sub-issue, size/XS | unit, e2e-blocking, e2e-advisory | Playwright repro of reporter steps + no pageerror |
| [#263](https://github.com/uplbtools/room-tba/issues/263) | qa, sub-issue, size/S, priority/medium | e2e-blocking, e2e-advisory, manual-only | Playwright repro of reporter steps + no pageerror |
| [#264](https://github.com/uplbtools/room-tba/issues/264) | enhancement, sub-issue, size/M, priority/medium | unit, e2e-blocking | Default: unit for new lib logic; E2E for user-visible AC |
| [#265](https://github.com/uplbtools/room-tba/issues/265) | enhancement, qa, sub-issue, size/L | manual-only | Human coordination checklist |
| [#266](https://github.com/uplbtools/room-tba/issues/266) | data, sub-issue, size/S, priority/medium | unit, integration | Fixture/import unit test; optional staging data-fidelity smoke |
| [#267](https://github.com/uplbtools/room-tba/issues/267) | qa, sub-issue, size/M, priority/medium | e2e-blocking | Playwright repro of reporter steps + no pageerror |
| [#268](https://github.com/uplbtools/room-tba/issues/268) | good first issue, qa, sub-issue, size/XS | e2e-blocking | Playwright repro of reporter steps + no pageerror |
| [#269](https://github.com/uplbtools/room-tba/issues/269) | good first issue, qa, sub-issue, size/XS | unit, integration, component, e2e-blocking, e2e-advisory | Playwright repro of reporter steps + no pageerror |
| [#270](https://github.com/uplbtools/room-tba/issues/270) | good first issue, qa, sub-issue, size/XS | e2e-blocking | Playwright repro of reporter steps + no pageerror |
| [#272](https://github.com/uplbtools/room-tba/issues/272) | size/L, priority/low | manual-only | Human coordination checklist |
| [#273](https://github.com/uplbtools/room-tba/issues/273) | released, size/XL, priority/low | unit, integration, e2e-blocking, e2e-advisory | integration/services or integration/http |
| [#274](https://github.com/uplbtools/room-tba/issues/274) | size/M, priority/low | unit, integration, component, e2e-blocking, e2e-advisory | HTTP integration + unit for guards/helpers |
| [#275](https://github.com/uplbtools/room-tba/issues/275) | size/L, priority/low | unit, integration, component, e2e-blocking, e2e-advisory | HTTP integration + unit for guards/helpers |
| [#286](https://github.com/uplbtools/room-tba/issues/286) | enhancement, released, data, size/S | unit, integration, component, e2e-blocking, e2e-advisory | Fixture/import unit test; optional staging data-fidelity smoke |
| [#287](https://github.com/uplbtools/room-tba/issues/287) | enhancement, released, data, size/S | unit, integration, component, e2e-blocking, e2e-advisory, manual-only | Fixture/import unit test; optional staging data-fidelity smoke |
| [#288](https://github.com/uplbtools/room-tba/issues/288) | enhancement, released, design improvement, size/M | manual-only | Human coordination checklist |
| [#289](https://github.com/uplbtools/room-tba/issues/289) | enhancement, size/L, priority/low | unit, integration, e2e-blocking, e2e-advisory | HTTP integration + unit for guards/helpers |
| [#293](https://github.com/uplbtools/room-tba/issues/293) | enhancement, size/L, priority/low | unit, integration, component, e2e-blocking | HTTP integration + unit for guards/helpers |
| [#294](https://github.com/uplbtools/room-tba/issues/294) | enhancement, size/M, priority/medium | unit, integration, component, e2e-blocking, e2e-advisory | integration/services or integration/http |
| [#295](https://github.com/uplbtools/room-tba/issues/295) | enhancement, size/L, priority/low | unit, integration, component, e2e-blocking, e2e-advisory | HTTP integration + unit for guards/helpers |
| [#296](https://github.com/uplbtools/room-tba/issues/296) | enhancement, parent issue, size/XL, priority/low | none | Roll up from linked sub-issues |
| [#300](https://github.com/uplbtools/room-tba/issues/300) | enhancement, data, size/M, priority/high | unit, integration, component, e2e-blocking | Fixture/import unit test; optional staging data-fidelity smoke |
| [#308](https://github.com/uplbtools/room-tba/issues/308) | enhancement, size/XL, priority/low | manual-only | Human coordination checklist |
| [#310](https://github.com/uplbtools/room-tba/issues/310) | enhancement, size/L, priority/medium | unit, integration, component, e2e-blocking | HTTP integration + unit for guards/helpers |
| [#313](https://github.com/uplbtools/room-tba/issues/313) | enhancement, size/M, priority/medium | unit, integration, component, e2e-blocking, e2e-advisory, manual-only | integration/services or integration/http |
| [#318](https://github.com/uplbtools/room-tba/issues/318) | enhancement, data, size/M, priority/high | manual-only | Human coordination checklist |
| [#327](https://github.com/uplbtools/room-tba/issues/327) | enhancement, released, size/L, priority/medium | unit, integration, component, e2e-blocking, e2e-advisory, manual-only | HTTP integration + unit for guards/helpers |
| [#335](https://github.com/uplbtools/room-tba/issues/335) | enhancement, qa, parent issue, size/L | none | Roll up from linked sub-issues |
| [#336](https://github.com/uplbtools/room-tba/issues/336) | enhancement, design improvement, size/M, priority/medium | manual-only | Human coordination checklist |
| [#337](https://github.com/uplbtools/room-tba/issues/337) | enhancement, design improvement, size/L, priority/low | unit, integration, component, e2e-blocking, e2e-advisory, manual-only | integration/services or integration/http |
| [#381](https://github.com/uplbtools/room-tba/issues/381) | enhancement, design improvement, size/L, priority/medium | unit, integration, component, e2e-blocking, e2e-advisory | e2e/advisory/a11y.spec.ts target surface |
| [#401](https://github.com/uplbtools/room-tba/issues/401) | bug | unit, integration, component, e2e-blocking | Regression: unit for pure logic; E2E for UI repro |
| [#404](https://github.com/uplbtools/room-tba/issues/404) | bug, performance improvement | unit, component, e2e-blocking, e2e-advisory, manual-only | Regression: unit for pure logic; E2E for UI repro |
| [#405](https://github.com/uplbtools/room-tba/issues/405) | bug, design improvement | unit, e2e-blocking | Regression: unit for pure logic; E2E for UI repro |
| [#406](https://github.com/uplbtools/room-tba/issues/406) | enhancement, design improvement | unit, e2e-blocking | Default: unit for new lib logic; E2E for user-visible AC |
| [#408](https://github.com/uplbtools/room-tba/issues/408) | enhancement, design improvement, size/M | unit, integration, component, e2e-blocking | integration/services or integration/http |
| [#409](https://github.com/uplbtools/room-tba/issues/409) | enhancement, design improvement, size/M | unit, integration, component, e2e-blocking | HTTP integration + unit for guards/helpers |
| [#410](https://github.com/uplbtools/room-tba/issues/410) | enhancement, design improvement, size/S | unit, integration, component, e2e-blocking, e2e-advisory, manual-only | HTTP integration + unit for guards/helpers |
| [#411](https://github.com/uplbtools/room-tba/issues/411) | enhancement, design improvement, size/M | component, e2e-blocking, e2e-advisory | e2e/advisory/a11y.spec.ts target surface |
| [#412](https://github.com/uplbtools/room-tba/issues/412) | enhancement, size/M | unit, integration, component, e2e-blocking, e2e-advisory, manual-only | HTTP integration + unit for guards/helpers |
| [#413](https://github.com/uplbtools/room-tba/issues/413) | enhancement, design improvement, size/S | integration, component, e2e-blocking | Vitest layout @320px + Playwright browse/admin spec |
| [#414](https://github.com/uplbtools/room-tba/issues/414) | enhancement, design improvement, size/M | unit, integration, component, e2e-blocking, e2e-advisory, manual-only | sync-keys/store unit; advisory offline-boot |
| [#415](https://github.com/uplbtools/room-tba/issues/415) | enhancement, performance improvement, size/L, priority/medium | unit, integration, component, e2e-blocking, e2e-advisory, manual-only | HTTP integration + unit for guards/helpers |
| [#416](https://github.com/uplbtools/room-tba/issues/416) | enhancement, design improvement, size/S | component, e2e-blocking, e2e-advisory | e2e/advisory/a11y.spec.ts target surface |
| [#417](https://github.com/uplbtools/room-tba/issues/417) | enhancement, design improvement, size/M | unit, integration, component, e2e-blocking, e2e-advisory | integration/services or integration/http |
| [#418](https://github.com/uplbtools/room-tba/issues/418) |: | unit, integration, component, e2e-blocking, e2e-advisory | integration/services or integration/http |
| [#419](https://github.com/uplbtools/room-tba/issues/419) |: | manual-only | Human coordination checklist |
| [#424](https://github.com/uplbtools/room-tba/issues/424) | enhancement | component, e2e-blocking, e2e-advisory | e2e/advisory/a11y.spec.ts target surface |
| [#426](https://github.com/uplbtools/room-tba/issues/426) | enhancement, design improvement | integration, component, e2e-blocking, e2e-advisory | e2e/advisory/a11y.spec.ts target surface |
| [#427](https://github.com/uplbtools/room-tba/issues/427) | enhancement, design improvement | integration, component, e2e-blocking, e2e-advisory, manual-only | integration/services or integration/http |
| [#441](https://github.com/uplbtools/room-tba/issues/441) | enhancement, performance improvement, size/S, priority/medium | unit, integration, component, e2e-blocking, e2e-advisory, manual-only | HTTP integration + unit for guards/helpers |
| [#442](https://github.com/uplbtools/room-tba/issues/442) | enhancement, performance improvement, size/S, priority/medium | unit, integration, e2e-blocking | HTTP integration + unit for guards/helpers |
| [#443](https://github.com/uplbtools/room-tba/issues/443) | enhancement, size/S, priority/medium | unit, integration, component, e2e-blocking | HTTP integration + unit for guards/helpers |
| [#445](https://github.com/uplbtools/room-tba/issues/445) | enhancement, performance improvement, size/M, priority/low | none | CI/tooling change only |

## Closed issues (coverage audit)

| Issue | Tiers | Notes |
| ----- | ----- | ----- |
| [#429](https://github.com/uplbtools/room-tba/issues/429) | verify-existing, unit, component, e2e-blocking, e2e-advisory | Shipped: confirm regression exists in pyramid; add if gap found |
| [#425](https://github.com/uplbtools/room-tba/issues/425) | verify-existing, integration, component, e2e-blocking, e2e-advisory | Shipped: confirm regression exists in pyramid; add if gap found |
| [#423](https://github.com/uplbtools/room-tba/issues/423) | integration, component, e2e-blocking | Closed: audit coverage before new work |
| [#421](https://github.com/uplbtools/room-tba/issues/421) | unit, integration, component, e2e-blocking, e2e-advisory, manual-only | AMIS, fetch manual only; closed: audit only |
| [#403](https://github.com/uplbtools/room-tba/issues/403) | unit, component, e2e-blocking | Closed: audit coverage before new work |
| [#402](https://github.com/uplbtools/room-tba/issues/402) | unit, component, e2e-blocking | Closed: audit coverage before new work |
| [#400](https://github.com/uplbtools/room-tba/issues/400) | verify-existing, unit, component, e2e-blocking | Shipped: confirm regression exists in pyramid; add if gap found |
| [#342](https://github.com/uplbtools/room-tba/issues/342) | unit, integration, component, e2e-blocking, e2e-advisory | AMIS, fetch manual only; closed: audit only |
| [#341](https://github.com/uplbtools/room-tba/issues/341) | unit, integration, component, e2e-blocking, e2e-advisory, manual-only | AMIS, fetch manual only; closed: audit only |
| [#340](https://github.com/uplbtools/room-tba/issues/340) | manual-only | Do not auto-close with code |
| [#339](https://github.com/uplbtools/room-tba/issues/339) | unit, integration, component, e2e-blocking, e2e-advisory | Closed: audit coverage before new work |
| [#338](https://github.com/uplbtools/room-tba/issues/338) | manual-only | Do not auto-close with code |
| [#334](https://github.com/uplbtools/room-tba/issues/334) | none | Verify existing workflow scripts |
| [#333](https://github.com/uplbtools/room-tba/issues/333) | none | Verify existing workflow scripts |
| [#332](https://github.com/uplbtools/room-tba/issues/332) | none | Verify existing workflow scripts |
| [#331](https://github.com/uplbtools/room-tba/issues/331) | none | Verify existing workflow scripts |
| [#330](https://github.com/uplbtools/room-tba/issues/330) | manual-only | Do not auto-close with code |
| [#329](https://github.com/uplbtools/room-tba/issues/329) | manual-only | Do not auto-close with code |
| [#326](https://github.com/uplbtools/room-tba/issues/326) | none | Verify existing workflow scripts |
| [#325](https://github.com/uplbtools/room-tba/issues/325) | integration, component, e2e-blocking, e2e-advisory | Closed: audit coverage before new work |
| [#324](https://github.com/uplbtools/room-tba/issues/324) | unit, component, e2e-blocking, e2e-advisory | Closed: audit coverage before new work |
| [#323](https://github.com/uplbtools/room-tba/issues/323) | unit, integration, component, e2e-blocking, e2e-advisory, manual-only | Closed: audit coverage before new work |
| [#322](https://github.com/uplbtools/room-tba/issues/322) | unit, component, e2e-blocking, e2e-advisory, manual-only | Closed: audit coverage before new work |
| [#321](https://github.com/uplbtools/room-tba/issues/321) | verify-existing, unit, integration, component, e2e-blocking, e2e-advisory, manual-only | Shipped: confirm regression exists in pyramid; add if gap found |
| [#320](https://github.com/uplbtools/room-tba/issues/320) | verify-existing, integration, component, e2e-blocking | Shipped: confirm regression exists in pyramid; add if gap found |
| [#319](https://github.com/uplbtools/room-tba/issues/319) | integration, component, e2e-blocking, e2e-advisory | Closed: audit coverage before new work |
| [#315](https://github.com/uplbtools/room-tba/issues/315) | manual-only | Do not auto-close with code |
| [#302](https://github.com/uplbtools/room-tba/issues/302) | unit, integration, component, e2e-blocking, e2e-advisory | Closed: audit coverage before new work |
| [#301](https://github.com/uplbtools/room-tba/issues/301) | unit, integration, component, e2e-blocking, e2e-advisory | AMIS, fetch manual only; closed: audit only |
| [#285](https://github.com/uplbtools/room-tba/issues/285) | unit, integration, component, e2e-blocking, e2e-advisory | Closed: audit coverage before new work |
| [#284](https://github.com/uplbtools/room-tba/issues/284) | manual-only | Do not auto-close with code |
| [#283](https://github.com/uplbtools/room-tba/issues/283) | component, e2e-blocking | Closed: audit coverage before new work |
| [#281](https://github.com/uplbtools/room-tba/issues/281) | unit, integration, e2e-blocking, e2e-advisory, manual-only | Closed: audit coverage before new work |
| [#280](https://github.com/uplbtools/room-tba/issues/280) | verify-existing, unit, integration, component, e2e-blocking, e2e-advisory, manual-only | Shipped: confirm regression exists in pyramid; add if gap found |
| [#239](https://github.com/uplbtools/room-tba/issues/239) | verify-existing, component, e2e-blocking | Shipped: confirm regression exists in pyramid; add if gap found |
| [#231](https://github.com/uplbtools/room-tba/issues/231) | unit, e2e-advisory | Closed: audit coverage before new work |
| [#229](https://github.com/uplbtools/room-tba/issues/229) | e2e-blocking | Closed: audit coverage before new work |
| [#216](https://github.com/uplbtools/room-tba/issues/216) | none | Verify existing workflow scripts |
| [#212](https://github.com/uplbtools/room-tba/issues/212) | unit, integration, component, e2e-blocking, e2e-advisory, manual-only | Closed: audit coverage before new work |
| [#208](https://github.com/uplbtools/room-tba/issues/208) | manual-only | Do not auto-close with code |
| [#207](https://github.com/uplbtools/room-tba/issues/207) | verify-existing, integration, component, e2e-blocking, e2e-advisory | Shipped: confirm regression exists in pyramid; add if gap found |
| [#205](https://github.com/uplbtools/room-tba/issues/205) | integration, component, e2e-blocking | Closed: audit coverage before new work |
| [#203](https://github.com/uplbtools/room-tba/issues/203) | manual-only | Do not auto-close with code |
| [#198](https://github.com/uplbtools/room-tba/issues/198) | component, e2e-blocking, e2e-advisory | Closed: audit coverage before new work |
| [#196](https://github.com/uplbtools/room-tba/issues/196) | unit, component, e2e-blocking, e2e-advisory | Closed: audit coverage before new work |
| [#195](https://github.com/uplbtools/room-tba/issues/195) | verify-existing, integration, component, e2e-blocking | Shipped: confirm regression exists in pyramid; add if gap found |
| [#194](https://github.com/uplbtools/room-tba/issues/194) | component, e2e-blocking, e2e-advisory | Closed: audit coverage before new work |
| [#193](https://github.com/uplbtools/room-tba/issues/193) | verify-existing, component, e2e-blocking, e2e-advisory | Shipped: confirm regression exists in pyramid; add if gap found |
| [#181](https://github.com/uplbtools/room-tba/issues/181) | e2e-blocking | Closed: audit coverage before new work |
| [#174](https://github.com/uplbtools/room-tba/issues/174) | manual-only | Do not auto-close with code |
| [#173](https://github.com/uplbtools/room-tba/issues/173) | verify-existing, component, e2e-blocking | Shipped: confirm regression exists in pyramid; add if gap found |
| [#171](https://github.com/uplbtools/room-tba/issues/171) | integration, e2e-blocking | Closed: audit coverage before new work |
| [#169](https://github.com/uplbtools/room-tba/issues/169) | manual-only | Do not auto-close with code |
| [#166](https://github.com/uplbtools/room-tba/issues/166) | component, e2e-blocking | Closed: audit coverage before new work |
| [#165](https://github.com/uplbtools/room-tba/issues/165) | integration, component, e2e-blocking, e2e-advisory | Closed: audit coverage before new work |
| [#164](https://github.com/uplbtools/room-tba/issues/164) | manual-only | Do not auto-close with code |
| [#163](https://github.com/uplbtools/room-tba/issues/163) | integration, component, e2e-blocking | Closed: audit coverage before new work |
| [#162](https://github.com/uplbtools/room-tba/issues/162) | manual-only | Do not auto-close with code |
| [#161](https://github.com/uplbtools/room-tba/issues/161) | unit, integration, component, e2e-blocking | AMIS, fetch manual only; closed: audit only |
| [#159](https://github.com/uplbtools/room-tba/issues/159) | unit, integration, component, e2e-blocking, e2e-advisory, manual-only | Closed: audit coverage before new work |
| [#155](https://github.com/uplbtools/room-tba/issues/155) | unit, integration, component, e2e-blocking, e2e-advisory, manual-only | Closed: audit coverage before new work |
| [#144](https://github.com/uplbtools/room-tba/issues/144) | component, e2e-blocking | Closed: audit coverage before new work |
| [#141](https://github.com/uplbtools/room-tba/issues/141) | e2e-blocking | Closed: audit coverage before new work |
| [#140](https://github.com/uplbtools/room-tba/issues/140) | e2e-blocking | Closed: audit coverage before new work |
| [#139](https://github.com/uplbtools/room-tba/issues/139) | e2e-blocking | Closed: audit coverage before new work |
| [#137](https://github.com/uplbtools/room-tba/issues/137) | unit, e2e-blocking | Closed: audit coverage before new work |
| [#136](https://github.com/uplbtools/room-tba/issues/136) | e2e-blocking | Closed: audit coverage before new work |
| [#130](https://github.com/uplbtools/room-tba/issues/130) | e2e-blocking | Closed: audit coverage before new work |
| [#125](https://github.com/uplbtools/room-tba/issues/125) | e2e-blocking | Closed: audit coverage before new work |
| [#124](https://github.com/uplbtools/room-tba/issues/124) | component, e2e-blocking, e2e-advisory | Closed: audit coverage before new work |
| [#123](https://github.com/uplbtools/room-tba/issues/123) | unit, e2e-blocking, e2e-advisory | Closed: audit coverage before new work |
| [#121](https://github.com/uplbtools/room-tba/issues/121) | e2e-blocking | Closed: audit coverage before new work |
| [#118](https://github.com/uplbtools/room-tba/issues/118) | unit, e2e-advisory | Closed: audit coverage before new work |
| [#113](https://github.com/uplbtools/room-tba/issues/113) | e2e-blocking | Closed: audit coverage before new work |
| [#111](https://github.com/uplbtools/room-tba/issues/111) | component, e2e-blocking | Closed: audit coverage before new work |
| [#110](https://github.com/uplbtools/room-tba/issues/110) | unit, component, e2e-blocking, e2e-advisory, manual-only | Closed: audit coverage before new work |
| [#107](https://github.com/uplbtools/room-tba/issues/107) | e2e-blocking | Closed: audit coverage before new work |
| [#106](https://github.com/uplbtools/room-tba/issues/106) | manual-only | Do not auto-close with code |
| [#99](https://github.com/uplbtools/room-tba/issues/99) | unit, component, e2e-blocking | Closed: audit coverage before new work |
| [#95](https://github.com/uplbtools/room-tba/issues/95) | e2e-blocking | Closed: audit coverage before new work |

_Showing 80 most recent closed; regenerate for full list._
