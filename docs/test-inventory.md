# Test inventory

Running list of **automated** tests in this repo. Regenerate after adding or moving specs:

```sh
bun run generate:test-inventory
```

**Last generated:** 2026-07-03  
**Total spec files:** 104

See [testing.md](testing.md) for commands, CI gates, and databases. Issue-linked expectations: [issue-test-matrix.md](issue-test-matrix.md).

## Summary by tier

| Command                    | Config / runner                         | Files    |
| -------------------------- | --------------------------------------- | -------- |
| `bun test src`             | Bun — unit (`src/lib`, `src/constants`) | 42       |
| `bun run test:components`  | Vitest — stores + Svelte @320px         | 17       |
| `bun run test:integration` | Bun — HTTP + services (E2E DB)          | 5        |
| `bun run e2e`              | Playwright blocking — local preview     | 26       |
| `bun run e2e:advisory`     | Playwright advisory — non-blocking CI   | 11       |
| `bun run e2e:staging`      | Playwright — live staging URL           | 3        |
| `bun run check:migrations` | Schema table guard (not a spec file)    | 1 script |

## CI mapping

| Workflow                                                                      | What runs                                                |
| ----------------------------------------------------------------------------- | -------------------------------------------------------- |
| [ci.yml](../.github/workflows/ci.yml)                                         | `bun test src`, `test:components`, lint, prod build      |
| [ci.yml](../.github/workflows/ci.yml) migrations job                          | `check:migrations` on E2E DB                             |
| [e2e.yml](../.github/workflows/e2e.yml)                                       | reset DB → build:e2e → integration → Playwright blocking |
| [e2e-advisory.yml](../.github/workflows/e2e-advisory.yml)                     | Playwright advisory                                      |
| [e2e-staging.yml](../.github/workflows/e2e-staging.yml)                       | Same blocking stack on `staging` branch + nightly        |
| [staging-smoke.yml](../.github/workflows/staging-smoke.yml)                   | Read-only staging Playwright (subset)                    |
| [bundle-advisory.yml](../.github/workflows/bundle-advisory.yml)               | JS bundle budget                                         |
| [discord-test-inventory.yml](../.github/workflows/discord-test-inventory.yml) | Refresh #test-suite on Discord                           |

Playwright **blocking** uses [playwright.config.ts](../playwright.config.ts) (`testDir: e2e`, ignores `advisory/` + `staging/`). Projects: **desktop-chrome**, **mobile-chrome** (skips `@desktop-only`).

## Unit tests (Bun) — 42 files

`bun test src/lib src/constants` (excludes `*.store.test.ts`).

- `src/constants/proposals.test.ts`
- `src/lib/__tests__/latency-tracker.test.ts`
- `src/lib/__tests__/normalize-room-code.test.ts`
- `src/lib/__tests__/og-meta.test.ts`
- `src/lib/__tests__/version.test.ts`
- `src/lib/admin/expected-version.test.ts`
- `src/lib/admin/require-editor.test.ts`
- `src/lib/admin/roles.test.ts`
- `src/lib/amis/fetch-classes.test.ts`
- `src/lib/amis/import-classes.test.ts`
- `src/lib/amis/normalize-class.test.ts`
- `src/lib/amis/room-scheduled-types.test.ts`
- `src/lib/amis/sanitize-row.test.ts`
- `src/lib/api/rate-limit.test.ts`
- `src/lib/browse-campus.test.ts`
- `src/lib/changelog-highlights.test.ts`
- `src/lib/contributor-progress.test.ts`
- `src/lib/editor/field-action-label.test.ts`
- `src/lib/editor/handle-persist-result.test.ts`
- `src/lib/entity-urls.test.ts`
- `src/lib/final-exams-calendar.test.ts`
- `src/lib/final-exams.test.ts`
- `src/lib/google-maps-links.test.ts`
- `src/lib/keyboard-shortcuts.test.ts`
- `src/lib/landing-modal-auto-open.test.ts`
- `src/lib/map-chrome.test.ts`
- `src/lib/notifications/notifications.test.ts`
- `src/lib/proposals/client.test.ts`
- `src/lib/r2-upload.test.ts`
- `src/lib/route-slugs.test.ts`
- `src/lib/schedule-import/day-stops.test.ts`
- `src/lib/schedule-import/match-classes.test.ts`
- `src/lib/schedule-import/parse-import.test.ts`
- `src/lib/schedule-renderer.test.ts`
- `src/lib/services/admin-service.test.ts`
- `src/lib/services/merge-service.test.ts`
- `src/lib/services/proposal-access.test.ts`
- `src/lib/shortcuts-panel-position.test.ts`
- `src/lib/stores/map-modes.test.ts`
- `src/lib/string-lists.test.ts`
- `src/lib/term-calendar.test.ts`
- `src/lib/term-url.test.ts`

## Store tests (Vitest) — 7 files

Included in `bun run test:components`.

- `src/lib/browse-campus.store.test.ts`
- `src/lib/local/data/sync-keys.store.test.ts`
- `src/lib/stores/editor-stores.store.test.ts`
- `src/lib/stores/jeepney.store.test.ts`
- `src/lib/stores/map-stores.store.test.ts`
- `src/lib/stores/schedule-route.store.test.ts`
- `src/lib/stores/sync-stores.store.test.ts`

## Component tests (Vitest) — 10 files

Layout guards at 320px / 768px where noted. Included in `bun run test:components`.

- `src/components/svelte/AdminLoginModal.component.test.ts`
- `src/components/svelte/BuildingTypeFilterBar.component.test.ts`
- `src/components/svelte/EditorShelf.component.test.ts`
- `src/components/svelte/controls/EntityDirectionsChip.component.test.ts`
- `src/components/svelte/controls/EntityPanelHeader.component.test.ts`
- `src/components/svelte/map-chrome/MapChromeActionChip.component.test.ts`
- `src/components/svelte/map-chrome/MapChromeGhostButton.component.test.ts`
- `src/components/svelte/map-chrome/MapChromeToggleButton.component.test.ts`
- `src/components/svelte/status-bar/StatusBarLinkGroups.component.test.ts`
- `src/test/map-chrome-layout.component.test.ts`

## Integration tests — 5 files

`bun run test:integration` (E2E Supabase; HTTP suites need preview — use `test:integration:live`).

- `integration/http/admin-auth-rate-limit.integration.test.ts`
- `integration/http/public.integration.test.ts`
- `integration/services/admin.integration.test.ts`
- `integration/services/merge.integration.test.ts`
- `integration/services/proposals.integration.test.ts`

## E2E blocking (Playwright) — 26 files

`bun run e2e` — smoke, browse, admin.

### Smoke (4)

- `e2e/smoke/boot.spec.ts`
- `e2e/smoke/entity-pages.spec.ts`
- `e2e/smoke/redirects.spec.ts`
- `e2e/smoke/term-classes.spec.ts`

### Browse (9)

- `e2e/browse/building-filters.spec.ts`
- `e2e/browse/campus-browse-chips.spec.ts`
- `e2e/browse/campus-events.spec.ts`
- `e2e/browse/entity-seo.spec.ts`
- `e2e/browse/final-exams.spec.ts`
- `e2e/browse/map-tools.spec.ts`
- `e2e/browse/search-collapse.spec.ts`
- `e2e/browse/search-flow.spec.ts`
- `e2e/browse/side-panel.spec.ts`

### Admin / editor (13)

- `e2e/admin/auth.spec.ts`
- `e2e/admin/building-3d.spec.ts`
- `e2e/admin/building-edit.spec.ts`
- `e2e/admin/college-division-edit.spec.ts`
- `e2e/admin/conflicts.spec.ts`
- `e2e/admin/dorm-edit.spec.ts`
- `e2e/admin/event-edit.spec.ts`
- `e2e/admin/history.spec.ts`
- `e2e/admin/map-edit.spec.ts`
- `e2e/admin/multi-user.spec.ts`
- `e2e/admin/proposals.spec.ts`
- `e2e/admin/room-edit.spec.ts`
- `e2e/admin/undo-redo.spec.ts`

## E2E advisory (Playwright) — 11 files

`bun run e2e:advisory` — a11y, offline, touch, cross-browser, etc.

- `e2e/advisory/a11y.spec.ts`
- `e2e/advisory/building-3d-autosave.spec.ts`
- `e2e/advisory/cross-browser.spec.ts`
- `e2e/advisory/keyboard-nav.spec.ts`
- `e2e/advisory/layout-chrome.spec.ts`
- `e2e/advisory/map-attribution.spec.ts`
- `e2e/advisory/mobile-touch-drag.spec.ts`
- `e2e/advisory/offline-boot.spec.ts`
- `e2e/advisory/offline-pwa.spec.ts`
- `e2e/advisory/schedule-import.spec.ts`
- `e2e/advisory/transit-jeepney.spec.ts`

## E2E staging (Playwright) — 3 files

`bun run e2e:staging` — read-only against `staging.room-tba.uplbtools.me`.

- `e2e/staging/data-fidelity.spec.ts`
- `e2e/staging/live-boot.spec.ts`
- `e2e/staging/live-browse.spec.ts`

## Other checks

| Script                     | Purpose                        |
| -------------------------- | ------------------------------ |
| `bun run check:migrations` | Required Postgres tables exist |
| `bun run check:readme`     | README onboarding facts        |
| `bun run check:pwa-legal`  | PWA legal routes               |
| `bun run check:bundle`     | Client JS budget (advisory CI) |

## Manual only (not in this list)

Subjective UX, AMIS live `--fetch`, prod data spot-checks — [testing.md § Manual only](testing.md#manual-only).
