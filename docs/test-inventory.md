# Test inventory

Running list of **automated** tests in this repo. Regenerate after adding or moving specs:

```sh
bun run generate:test-inventory
```

**Last generated:** 2026-11-25<br>
**Total spec files:** 394

See [testing.md](testing.md) for commands, CI gates, and databases. Issue-linked expectations: [issue-test-matrix.md](issue-test-matrix.md).

## Summary by tier

| Command | Config / runner | Files |
| ------- | ---------------- | ----- |
| `bun test src` | Bun — unit (`src/lib`, `src/constants`) | 179 |
| `bun run test:components` | Vitest — stores + Svelte @320px | 106 |
| `bun run test:integration` | Bun — HTTP + services (E2E DB) | 18 |
| `bun run e2e` | Playwright blocking — local preview | 59 |
| `bun run e2e:advisory` | Playwright advisory — non-blocking CI | 20 |
| `bun run e2e:staging` | Playwright — live staging URL | 3 |
| `bun run check:migrations` | Schema table guard (not a spec file) | 1 script |


## CI mapping

| Workflow | What runs |
| -------- | --------- |
| [ci.yml](../.github/workflows/ci.yml) | `bun test src`, `test:components`, lint, prod build |
| [ci.yml](../.github/workflows/ci.yml) migrations job | `check:migrations` on E2E DB |
| [e2e.yml](../.github/workflows/e2e.yml) | reset DB → build:e2e → integration → Playwright blocking |
| [e2e-advisory.yml](../.github/workflows/e2e-advisory.yml) | Playwright advisory |
| [e2e-staging.yml](../.github/workflows/e2e-staging.yml) | Same blocking stack on `staging` branch + nightly |
| [staging-smoke.yml](../.github/workflows/staging-smoke.yml) | Read-only staging Playwright (subset) |
| [bundle-advisory.yml](../.github/workflows/bundle-advisory.yml) | JS bundle budget |
| [discord-test-inventory.yml](../.github/workflows/discord-test-inventory.yml) | Refresh #test-suite on Discord |

Playwright **blocking** uses [playwright.config.ts](../playwright.config.ts) (`testDir: e2e`, ignores `advisory/` + `staging/`). Projects: **desktop-chrome**, **mobile-chrome** (skips `@desktop-only`).

## Unit tests (Bun) — 179 files

`bun test src/lib src/constants` (excludes `*.store.test.ts`).

- `src/constants/building-types.test.ts`
- `src/constants/community-links.test.ts`
- `src/constants/cr-facilities.test.ts`
- `src/constants/data-license.test.ts`
- `src/constants/emergency-hotlines.test.ts`
- `src/constants/jeepney-routes.test.ts`
- `src/constants/org-categories.test.ts`
- `src/constants/place-categories.test.ts`
- `src/constants/proposals.test.ts`
- `src/constants/room-categories.test.ts`
- `src/lib/__tests__/latency-tracker.test.ts`
- `src/lib/__tests__/no-interpunct.test.ts`
- `src/lib/__tests__/normalize-room-code.test.ts`
- `src/lib/__tests__/og-meta.test.ts`
- `src/lib/__tests__/version.test.ts`
- `src/lib/acad-orgs.test.ts`
- `src/lib/academic-calendar-pdf.test.ts`
- `src/lib/academic-calendar.test.ts`
- `src/lib/academic-milestones.test.ts`
- `src/lib/admin/expected-version.test.ts`
- `src/lib/admin/require-editor.test.ts`
- `src/lib/admin/roles.test.ts`
- `src/lib/admin/signed-token.test.ts`
- `src/lib/amis/fetch-classes.test.ts`
- `src/lib/amis/import-classes.test.ts`
- `src/lib/amis/import-errors.test.ts`
- `src/lib/amis/normalize-class.test.ts`
- `src/lib/amis/room-scheduled-types.test.ts`
- `src/lib/amis/sanitize-row.test.ts`
- `src/lib/announcements.test.ts`
- `src/lib/api/class-cursor.test.ts`
- `src/lib/api/feedback.test.ts`
- `src/lib/api/json.test.ts`
- `src/lib/api/pagination.test.ts`
- `src/lib/api/proposal-rate-limit.test.ts`
- `src/lib/api/rate-limit-shared.test.ts`
- `src/lib/api/rate-limit.test.ts`
- `src/lib/app-env.test.ts`
- `src/lib/app-screen-path.test.ts`
- `src/lib/app-url-state.test.ts`
- `src/lib/auth/breached-password.test.ts`
- `src/lib/auth/contributor-signup.test.ts`
- `src/lib/auth/email-verification.test.ts`
- `src/lib/auth/login-steps.test.ts`
- `src/lib/auth/password-hash.test.ts`
- `src/lib/auth/secret-box.test.ts`
- `src/lib/auth/totp.test.ts`
- `src/lib/avatar.test.ts`
- `src/lib/bottom-sheet-snap.test.ts`
- `src/lib/browse-campus.test.ts`
- `src/lib/building-3d.test.ts`
- `src/lib/building-footprints.test.ts`
- `src/lib/campus-audit.test.ts`
- `src/lib/campus-gate-coordinates-template.test.ts`
- `src/lib/campus-list-state.test.ts`
- `src/lib/campus-office-directory.test.ts`
- `src/lib/campus-route.test.ts`
- `src/lib/changelog-highlights.test.ts`
- `src/lib/ci/feature-test-retirement.test.ts`
- `src/lib/class-offering-groups.test.ts`
- `src/lib/color-contrast.test.ts`
- `src/lib/contributor-progress.test.ts`
- `src/lib/contributors/scoring.test.ts`
- `src/lib/db-column-fallback.test.ts`
- `src/lib/directory-labels.test.ts`
- `src/lib/editor/draft-pin-preview.test.ts`
- `src/lib/editor/entity-attribution.test.ts`
- `src/lib/editor/field-action-label.test.ts`
- `src/lib/editor/handle-persist-result.test.ts`
- `src/lib/editor/history-presentation.test.ts`
- `src/lib/email/digest-core.test.ts`
- `src/lib/email/review-notice-core.test.ts`
- `src/lib/email/unsubscribe-core.test.ts`
- `src/lib/entity-urls.test.ts`
- `src/lib/final-exams.test.ts`
- `src/lib/fork/campus-config-template.test.ts`
- `src/lib/generic-class-import.test.ts`
- `src/lib/geolocation.test.ts`
- `src/lib/google-maps-links.test.ts`
- `src/lib/h-scroll.test.ts`
- `src/lib/keyboard-shortcuts.test.ts`
- `src/lib/kubo-dorms.test.ts`
- `src/lib/landing-modal-auto-open.test.ts`
- `src/lib/landmark-images.test.ts`
- `src/lib/like-escape.test.ts`
- `src/lib/local/clear-cached-data.test.ts`
- `src/lib/local/data/app-data-snapshot.test.ts`
- `src/lib/local/data/campus-directory-sync.test.ts`
- `src/lib/local/data/keep-cached-rows.test.ts`
- `src/lib/local/data/pglite-schema.test.ts`
- `src/lib/local/data/sync-keys.test.ts`
- `src/lib/local/resync-campus-data.test.ts`
- `src/lib/makiling-trail.test.ts`
- `src/lib/map-basemap-palette.test.ts`
- `src/lib/map-chrome.test.ts`
- `src/lib/map-fit.test.ts`
- `src/lib/map-label-declutter.test.ts`
- `src/lib/map-satellite.test.ts`
- `src/lib/maptiler-key.test.ts`
- `src/lib/notifications/notifications.test.ts`
- `src/lib/notifications/outbox-core.test.ts`
- `src/lib/notifications/proposal-events.test.ts`
- `src/lib/osa-organization-directory.test.ts`
- `src/lib/osm-basemap.test.ts`
- `src/lib/overpass.test.ts`
- `src/lib/place-facts.test.ts`
- `src/lib/planner/alternatives.test.ts`
- `src/lib/planner/conflicts.test.ts`
- `src/lib/planner/format.test.ts`
- `src/lib/planner/ics.test.ts`
- `src/lib/planner/persist.test.ts`
- `src/lib/planner/plan-image.test.ts`
- `src/lib/planner/share-codec-expand.test.ts`
- `src/lib/planner/share-codec.test.ts`
- `src/lib/planner/types.test.ts`
- `src/lib/presence.test.ts`
- `src/lib/probable-location.test.ts`
- `src/lib/proposals/apply-published-entity.test.ts`
- `src/lib/proposals/client.test.ts`
- `src/lib/proposals/create-proposal-validation.test.ts`
- `src/lib/proposals/diff.test.ts`
- `src/lib/proposals/entity-names.test.ts`
- `src/lib/proposals/pending-proposals.test.ts`
- `src/lib/proposals/proposal-merge-policy.test.ts`
- `src/lib/proposals/proposal-pin.test.ts`
- `src/lib/proposals/proposal-token.test.ts`
- `src/lib/proposals/review-queue-params.test.ts`
- `src/lib/proposals/review-shortcuts.test.ts`
- `src/lib/r2-quarantine.test.ts`
- `src/lib/r2-upload.test.ts`
- `src/lib/release-timestamps.test.ts`
- `src/lib/reverse-geocode.test.ts`
- `src/lib/room-full-name.test.ts`
- `src/lib/room-placement.test.ts`
- `src/lib/route-arrows.test.ts`
- `src/lib/route-slugs.test.ts`
- `src/lib/schedule-import/day-stops.test.ts`
- `src/lib/schedule-import/match-classes.test.ts`
- `src/lib/schedule-renderer.test.ts`
- `src/lib/search-suggestions.test.ts`
- `src/lib/security-headers.test.ts`
- `src/lib/server/kubo-dorm-directory.test.ts`
- `src/lib/services/admin-service.test.ts`
- `src/lib/services/bulk-history.test.ts`
- `src/lib/services/merge-service.test.ts`
- `src/lib/services/proposal-access.test.ts`
- `src/lib/share-link.test.ts`
- `src/lib/share-links.test.ts`
- `src/lib/sheet-drag-intent.test.ts`
- `src/lib/sponsors.test.ts`
- `src/lib/stores/map-modes.test.ts`
- `src/lib/street-view-lookup.test.ts`
- `src/lib/street-view.test.ts`
- `src/lib/string-lists.test.ts`
- `src/lib/term-calendar.test.ts`
- `src/lib/term-label.test.ts`
- `src/lib/term-url.test.ts`
- `src/lib/theme.test.ts`
- `src/lib/today-agenda.test.ts`
- `src/lib/transit-crowding.test.ts`
- `src/lib/transit-direction.test.ts`
- `src/lib/transit-map-pdf.test.ts`
- `src/lib/transit-reports.test.ts`
- `src/lib/transit-route-kind.test.ts`
- `src/lib/transit-route-visibility.test.ts`
- `src/lib/transit-schedule.test.ts`
- `src/lib/transit-urls.test.ts`
- `src/lib/travel-graph/directions-fit.test.ts`
- `src/lib/travel-graph/engine.test.ts`
- `src/lib/travel-graph/journey-steps.test.ts`
- `src/lib/travel-graph/journey.test.ts`
- `src/lib/travel-graph/plan-multi-leg.test.ts`
- `src/lib/travel-graph/ride-geometry.test.ts`
- `src/lib/travel-graph/route-proximity.test.ts`
- `src/lib/turnstile-core.test.ts`
- `src/lib/wayback-imagery.test.ts`
- `src/lib/wiki-freshness.test.ts`
- `src/lib/wiki-html.test.ts`
- `src/lib/wiki-pages.test.ts`


## Store tests (Vitest) — 25 files

Included in `bun run test:components`.

- `src/lib/browse-campus.store.test.ts`
- `src/lib/classes-api.store.test.ts`
- `src/lib/entity-url-sync.store.test.ts`
- `src/lib/local/data/cache-first-local.store.test.ts`
- `src/lib/local/data/entity-cache-gate.store.test.ts`
- `src/lib/local/data/get-entity-rooms.store.test.ts`
- `src/lib/local/data/get-entity.store.test.ts`
- `src/lib/local/data/sync-keys.store.test.ts`
- `src/lib/overlay-history.store.test.ts`
- `src/lib/proposals/apply-published-entity.store.test.ts`
- `src/lib/proposals/sync-open-entity-query.store.test.ts`
- `src/lib/saved-places.store.test.ts`
- `src/lib/side-panel-content.store.test.ts`
- `src/lib/stores/current-room.store.test.ts`
- `src/lib/stores/data-stores.store.test.ts`
- `src/lib/stores/directions.store.test.ts`
- `src/lib/stores/editor-stores.store.test.ts`
- `src/lib/stores/jeepney.store.test.ts`
- `src/lib/stores/map-overlays.store.test.ts`
- `src/lib/stores/map-stores.store.test.ts`
- `src/lib/stores/planner-buildings.store.test.ts`
- `src/lib/stores/planner.store.test.ts`
- `src/lib/stores/schedule-route.store.test.ts`
- `src/lib/stores/sync-stores.store.test.ts`
- `src/lib/stores/ui-stores.store.test.ts`


## Component tests (Vitest) — 81 files

Layout guards at 320px / 768px where noted. Included in `bun run test:components`.

- `src/components/svelte/AccountSettingsModal.component.test.ts`
- `src/components/svelte/AdminLoginModal.component.test.ts`
- `src/components/svelte/AnnouncementBar.component.test.ts`
- `src/components/svelte/BottomSheet.component.test.ts`
- `src/components/svelte/BuildingTypeFilterBar.component.test.ts`
- `src/components/svelte/CameraDebugHud.component.test.ts`
- `src/components/svelte/EditorAdditionModal.component.test.ts`
- `src/components/svelte/EditorShelf.component.test.ts`
- `src/components/svelte/EntityLastUpdated.component.test.ts`
- `src/components/svelte/FirstRunTips.component.test.ts`
- `src/components/svelte/MapToolsFlyout.component.test.ts`
- `src/components/svelte/MapToolsFlyout.debug.component.test.ts`
- `src/components/svelte/MapViewControls.component.test.ts`
- `src/components/svelte/MeasureRoutePanel.component.test.ts`
- `src/components/svelte/OfflineBanner.component.test.ts`
- `src/components/svelte/OnlineCounter.component.test.ts`
- `src/components/svelte/ProposalReviewPanel.component.test.ts`
- `src/components/svelte/ResetPasswordForm.component.test.ts`
- `src/components/svelte/ReviewQueueFilters.component.test.ts`
- `src/components/svelte/SponsorBanner.component.test.ts`
- `src/components/svelte/StagingBanner.component.test.ts`
- `src/components/svelte/StatusBar.component.test.ts`
- `src/components/svelte/ThemeSwitch.component.test.ts`
- `src/components/svelte/TravelTimeLegend.component.test.ts`
- `src/components/svelte/WaybackImageryControl.component.test.ts`
- `src/components/svelte/account/EmailNotificationsSection.component.test.ts`
- `src/components/svelte/admin/AdminHome.component.test.ts`
- `src/components/svelte/calendar/AcademicCalendarScreen.component.test.ts`
- `src/components/svelte/community/CommunityBrandIcon.component.test.ts`
- `src/components/svelte/community/FollowPrompt.component.test.ts`
- `src/components/svelte/controls/BuildingPhoto.component.test.ts`
- `src/components/svelte/controls/DormResult.component.test.ts`
- `src/components/svelte/controls/DroppedPinPanel.component.test.ts`
- `src/components/svelte/controls/EntityDirectionsChip.component.test.ts`
- `src/components/svelte/controls/EntityEmptyState.component.test.ts`
- `src/components/svelte/controls/EntityPanelHeader.component.test.ts`
- `src/components/svelte/controls/EntitySaveButton.component.test.ts`
- `src/components/svelte/controls/EventsList.component.test.ts`
- `src/components/svelte/controls/JeepneyStopPanel.component.test.ts`
- `src/components/svelte/controls/PlaceSheetHeader.component.test.ts`
- `src/components/svelte/controls/PlaceSheetTabs.component.test.ts`
- `src/components/svelte/controls/ResultDisplay.component.test.ts`
- `src/components/svelte/controls/TransitRouteLifecycle.component.test.ts`
- `src/components/svelte/directions/CommuteItinerary.component.test.ts`
- `src/components/svelte/directions/DirectionsPanel.component.test.ts`
- `src/components/svelte/directions/DirectionsRouteChips.component.test.ts`
- `src/components/svelte/directions/NavigationBar.component.test.ts`
- `src/components/svelte/final-exams/FinalExamsScreen.component.test.ts`
- `src/components/svelte/map-chrome/ActiveOverlayChips.component.test.ts`
- `src/components/svelte/map-chrome/DesktopTopBar.component.test.ts`
- `src/components/svelte/map-chrome/MapChromeActionChip.component.test.ts`
- `src/components/svelte/map-chrome/MapChromeGhostButton.component.test.ts`
- `src/components/svelte/map-chrome/MapChromeToggleButton.component.test.ts`
- `src/components/svelte/map-chrome/MapContextMenu.component.test.ts`
- `src/components/svelte/map-chrome/MapControlsStack.component.test.ts`
- `src/components/svelte/map-chrome/MapFilterChips.component.test.ts`
- `src/components/svelte/map-chrome/bottom-chrome-icons.component.test.ts`
- `src/components/svelte/map/ContributorDraftPinMarker.component.test.ts`
- `src/components/svelte/modal/AnnouncementsModal.component.test.ts`
- `src/components/svelte/modal/ChangelogModal.component.test.ts`
- `src/components/svelte/modal/EntityHistoryModal.component.test.ts`
- `src/components/svelte/modal/FeedbackPanel.component.test.ts`
- `src/components/svelte/modal/HotlinesModal.component.test.ts`
- `src/components/svelte/modal/JeepneyRouteModal.component.test.ts`
- `src/components/svelte/modal/LandingModal.component.test.ts`
- `src/components/svelte/modal/ManageUsersModal.component.test.ts`
- `src/components/svelte/modal/ModalScrollbars.component.test.ts`
- `src/components/svelte/modal/SavedPlacesModal.component.test.ts`
- `src/components/svelte/modal/SettingsModal.component.test.ts`
- `src/components/svelte/planner/PlannerCourseSearch.component.test.ts`
- `src/components/svelte/planner/PlannerScreen.component.test.ts`
- `src/components/svelte/room/Classes.component.test.ts`
- `src/components/svelte/room/RoomResult.component.test.ts`
- `src/components/svelte/search/Suggestions.component.test.ts`
- `src/components/svelte/status-bar/AppMenu.component.test.ts`
- `src/components/svelte/status-bar/ContributionRewardWatcher.component.test.ts`
- `src/components/svelte/status-bar/LeaderboardPanel.component.test.ts`
- `src/components/svelte/today/TodayScreen.component.test.ts`
- `src/components/svelte/trail/TrailPanel.component.test.ts`
- `src/lib/focus-trap.component.test.ts`
- `src/test/map-chrome-layout.component.test.ts`


## Integration tests — 18 files

`bun run test:integration` (E2E Supabase; HTTP suites need preview — use `test:integration:live`).

- `integration/http/admin-auth-rate-limit.integration.test.ts`
- `integration/http/feedback.integration.test.ts`
- `integration/http/proposals-rate-limit.integration.test.ts`
- `integration/http/public.integration.test.ts`
- `integration/services/account-management.integration.test.ts`
- `integration/services/admin.integration.test.ts`
- `integration/services/auth-reliability.integration.test.ts`
- `integration/services/auth-security.integration.test.ts`
- `integration/services/contribution.integration.test.ts`
- `integration/services/contributor-link.integration.test.ts`
- `integration/services/digest.integration.test.ts`
- `integration/services/editor-credits.integration.test.ts`
- `integration/services/history.integration.test.ts`
- `integration/services/map-data.integration.test.ts`
- `integration/services/merge.integration.test.ts`
- `integration/services/presence.integration.test.ts`
- `integration/services/proposals.integration.test.ts`
- `integration/services/transit.integration.test.ts`


## E2E blocking (Playwright) — 59 files

`bun run e2e` — smoke, browse, admin.

### Smoke (22)

- `e2e/smoke/academic-calendar-route.spec.ts`
- `e2e/smoke/app-menu.spec.ts`
- `e2e/smoke/boot.spec.ts`
- `e2e/smoke/browse-campus.spec.ts`
- `e2e/smoke/content-page-no-service-worker.spec.ts`
- `e2e/smoke/desktop-only-css-split.spec.ts`
- `e2e/smoke/entity-pages.spec.ts`
- `e2e/smoke/final-exams-route.spec.ts`
- `e2e/smoke/fork-wizard.spec.ts`
- `e2e/smoke/planner-account-sync.spec.ts`
- `e2e/smoke/planner-drag-section.spec.ts`
- `e2e/smoke/planner-flow.spec.ts`
- `e2e/smoke/planner-management.spec.ts`
- `e2e/smoke/planner-route.spec.ts`
- `e2e/smoke/redirects.spec.ts`
- `e2e/smoke/reset-password.spec.ts`
- `e2e/smoke/sidebar-external-links.spec.ts`
- `e2e/smoke/sponsors-page.spec.ts`
- `e2e/smoke/term-classes.spec.ts`
- `e2e/smoke/today-route.spec.ts`
- `e2e/smoke/wiki.spec.ts`
- `e2e/smoke/zoom-levels.spec.ts`


### Browse (22)

- `e2e/browse/any-point-map.spec.ts`
- `e2e/browse/app-menu-reachability.spec.ts`
- `e2e/browse/back-closes-layers.spec.ts`
- `e2e/browse/campus-browse-chips.spec.ts`
- `e2e/browse/campus-directory.spec.ts`
- `e2e/browse/campus-events.spec.ts`
- `e2e/browse/chrome-layout-invariants.spec.ts`
- `e2e/browse/entity-history.spec.ts`
- `e2e/browse/entity-seo.spec.ts`
- `e2e/browse/final-exams.spec.ts`
- `e2e/browse/landing-modal-mobile.spec.ts`
- `e2e/browse/map-overlays.spec.ts`
- `e2e/browse/map-tools.spec.ts`
- `e2e/browse/modal-scrollbars.spec.ts`
- `e2e/browse/place-full-screen.spec.ts`
- `e2e/browse/probable-location.spec.ts`
- `e2e/browse/satellite-toggle.spec.ts`
- `e2e/browse/search-collapse.spec.ts`
- `e2e/browse/search-flow.spec.ts`
- `e2e/browse/side-panel.spec.ts`
- `e2e/browse/theme-landscape.spec.ts`
- `e2e/browse/transit-stop-panel.spec.ts`


### Admin / editor (15)

- `e2e/admin/admin-landing.spec.ts`
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
- `e2e/admin/plan-persistence.spec.ts`
- `e2e/admin/proposals.spec.ts`
- `e2e/admin/room-edit.spec.ts`
- `e2e/admin/undo-redo.spec.ts`


## E2E advisory (Playwright) — 20 files

`bun run e2e:advisory` — a11y, offline, touch, cross-browser, etc.

- `e2e/advisory/a11y.spec.ts`
- `e2e/advisory/building-3d-autosave.spec.ts`
- `e2e/advisory/clear-cached-data.spec.ts`
- `e2e/advisory/cross-browser.spec.ts`
- `e2e/advisory/feedback-box.spec.ts`
- `e2e/advisory/jeepney-route-modal.spec.ts`
- `e2e/advisory/keyboard-nav.spec.ts`
- `e2e/advisory/layout-chrome.spec.ts`
- `e2e/advisory/map-attribution.spec.ts`
- `e2e/advisory/map-camera-debug.spec.ts`
- `e2e/advisory/maptiler-fallback.spec.ts`
- `e2e/advisory/measure-route.spec.ts`
- `e2e/advisory/mobile-touch-drag.spec.ts`
- `e2e/advisory/offline-banner.spec.ts`
- `e2e/advisory/offline-boot.spec.ts`
- `e2e/advisory/offline-pwa.spec.ts`
- `e2e/advisory/online-counter.spec.ts`
- `e2e/advisory/schedule-import.spec.ts`
- `e2e/advisory/transit-jeepney.spec.ts`
- `e2e/advisory/travel-time.spec.ts`


## E2E staging (Playwright) — 3 files

`bun run e2e:staging` — read-only against `staging.room-tba.uplb.tools`.

- `e2e/staging/data-fidelity.spec.ts`
- `e2e/staging/live-boot.spec.ts`
- `e2e/staging/live-browse.spec.ts`


## Other checks

| Script | Purpose |
| ------ | ------- |
| `bun run check:migrations` | Required Postgres tables exist |
| `bun run check:readme` | README onboarding facts |
| `bun run check:pwa-legal` | PWA legal routes |
| `bun run check:bundle` | Client JS budget (advisory CI) |

## Manual only (not in this list)

Subjective UX, AMIS live `--fetch`, prod data spot-checks — [testing.md § Manual only](testing.md#manual-only).
