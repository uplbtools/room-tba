# Map UI mode matrix

Source of truth for which map chrome is visible in each mode.

| Mode | Search dropdown | Event banner | Events shelf | Map tools | Building filters | Edit dock | Sync UI | Map attribution |
| ----------------------------- | --------------- | ------------ | ------------ | -------------- | ------------------ | --------------------- | ---------- | --------------- |
| Browse | yes | yes | yes | closed default | **yes (chip bar)** | hidden | status bar | bottom band |
| Browse (search collapsed) | on expand | on expand | on expand | closed default | **yes (chip bar)** | hidden | status bar | bottom band |
| Edit (`mapEditStore.enabled`) | **no** | **no** | **no** | closed default | **no** | **yes (mobile dock)** | status bar | bottom band |
| Event placement | **no** | **no** | **no** | closed default | **no** | cancel dock | status bar | bottom band |
| Terrain active | yes | yes | yes | flyout section | **yes (chip bar)** | hidden | status bar | bottom band |
| Transit active | yes | yes | yes | closed default | **yes (chip bar)** | hidden | status bar | bottom band |

Implementation: `getMapChromeVisibility()` in `src/lib/map-chrome.ts`.

## Browse overlay exclusivity (chip row)

Only one browse overlay from the chip row is active at a time (except **All** pins, the neutral default):

- **Transit on** → building/dorm pin filter resets to **All** (`jeepneyStore.enableLayer` sets `buildingTypeFilter` to `"all"`). Covers the search chip, Map tools → Transit, and the route sub-panel: every enable path funnels through `enableLayer`.
- **Non-All pin filter selected** (Class / Admin / UP dorms / Other dorms) → transit layer + selected route/stop turn off (`BuildingTypeFilterBar.selectFilter` calls `jeepneyStore.disableLayer`).
- **Events shelf** ↔ Transit exclusivity is unchanged (`openEventsShelf` disables transit; transit active closes the events shelf).
- **All** is neutral: selecting it does not touch transit.
- Edit/terrain exclusivity via `deactivateMapModesExcept` is unchanged.

Term-chip exclusivity: opening the term picker closes the map tools flyout (and vice versa) so top-band popovers do not stack on mobile.

## Overlay stacking (`.app-layout` tokens)

Lowest to highest:

| Layer | Token / value | Surfaces |
| ------------------------- | ------------------------ | ---------------------------------------------- |
| Map canvas | `, z-map: 0` | MapLibre canvas |
| Side panel | `, z-side-panel: 2` | MainControls drawer |
| Bottom chrome | `, z-status-bar: 5` | Status bar tray |
| UI shell | `10` (`.ui-layer`) | Search, side panel host |
| Drawer-lift FABs | `14` | Location button when sheet open |
| Map tools (mobile) | `, z-map-tools: 16` | Map tools flyout stack |
| Chrome popovers | `, z-chrome-popover: 17` | Term picker, offline maps (portaled to `body`) |
| Edit dock / editor screen | `18` | Map edit toolbar |
| Browse modals | `, z-modal: 100` | Landing, schedule expand |
| Login / editor addition | `, z-login-modal: 200` | Admin login (closes browse modals on open) |
| Toast | `, z-toast: 1000` | App-layout sibling (above edit dock) |

Portaled popovers use `use:portal` so they are not trapped in the bottom-chrome stacking context. Editor login closes browse modals before opening.

## Layout zones (Entry.svelte)

- **Top band:** search column (editor icon button when signed in), **campus browse chips** (`CampusBrowseChips.svelte`: Buildings / Colleges / Divisions / Classes: always in the chip row, opens the side-panel browse list), **term selector chip** (`TermSelector.svelte`, class schedules), building pin filter chips (`BuildingTypeFilterBar.svelte`), transit toggle chip (`TransitFilterChip.svelte`, count badge + route sub-panel when active), event banner, Map tools trigger; mobile chip row includes compact `MapDimensionToggle` (2D/3D only). Browse opens `CampusBrowseList.svelte` / `ClassesList.svelte` in the side drawer: not a centered modal. The search suggestions dropdown is for recent searches and typed results only. **Keyboard shortcuts** are opened from the app menu (`AppMenu.svelte`) or the `?` key, not from search chrome. Individual jeepney routes are picked in the transit sub-panel under the chip row or in Map tools → Transit (`JeepneyMenu.svelte` / `TransitRoutePanel.svelte`), not as top-level chips. On mobile (≤48rem), the editor icon opens a full-screen editor dashboard (`EditorScreen.svelte`) instead of an inline shelf under the chip row.
- **Map face:** map canvas, desktop unified camera column (`camera-controls-card`: vertical 2D/3D + rotate/tilt/north)
- **Bottom band:** unified bottom chrome tray (`.bottom-chrome` in `Entry.svelte`); attribution leading, status center, location/propose actions trailing; one shared surface
- **Ephemeral:** toast, modals, mobile editor screen (`EditorScreen.svelte` when `editorChromeStore.shelfOpen`)

MapLibre attribution is disabled on the map canvas (`attributionControl={false}`). Required basemap credits live in `MapAttribution` on the bottom band so they stay visible above the mobile detail sheet.

## CSS anchors (on `.app-layout`)

- `, map-ui-padding`
- `, map-search-inline-pad` (mobile search bar horizontal inset; defaults with `, map-ui-padding`)
- `, search-block-height`
- `, status-bar-block-height` (measured from full `.bottom-chrome` tray)
- `, side-panel-top-inset` (search block + map padding; desktop fixed drawer top)
- `, side-panel-bottom-inset` (measured from `.bottom-chrome` top edge + `, side-panel-bottom-gap`; fixed drawer/sheet bottom)
- `, side-panel-bottom-inset-measured` (runtime px distance from viewport bottom to status tray top; set in `Entry.svelte`)
- `, side-panel-bottom-gap` (extra clearance between drawer and status tray)
- `, drawer-peek-offset`
- `, mobile-detail-sheet-top-inset` (mobile entity detail sheet; below search app bar)
- `, map-ui-padding` is `0.375rem` horizontal on mobile (search + drawer gutter; bottom band stays edge-to-edge)
- `, mobile-detail-sheet-gap` (vertical space between measured search block and mobile detail sheet)
- Mobile detail sheet inset horizontally by `, map-ui-padding`; rounded card, not viewport-bleed
- `, bottom-fab-inset` (measured from `.bottom-chrome__actions` width + `, bottom-chrome-gap`; reserves space for edit dock right edge)
- `, bottom-chrome-gap` (gap between bottom chrome and edit dock; defaults to `, bottom-fab-gap`)
- `, bottom-fab-gap` (spacing between bottom chrome and edit dock)
- `, edit-bar-height` (measured edit dock height; non-zero when editing; set via ResizeObserver in `Map.svelte`)

Use these instead of magic `bottom` / `top` values.

## Side panel zones (MainControls drawer)

Entity detail views (`RoomResult`, `BuildingResult`, `DormResult`, etc.) use shared layout from `controls/entity-detail.css`:

| Zone | Contents |
| ---------- | ---------------------------------------------------------------------------------------------------- |
| Header | Breadcrumb (optional), title + badge, context line, **one** actions row (Copy link, Edit, nav chips) |
| Body | Browse text; editor panel expands inline when Edit is open |
| Directions | Merged directions text + suggest links + Directions / Google Maps chips |
| Footer | Secondary links only (e.g. classes schedule, external refs) |

Do not add duplicate action rows or colored highlight boxes. See `.cursor/rules/side-panel.mdc`.

## Verification viewports

320px, 768px, desktop; browse, edit mode, map tools open, sync active.

## Motion

Functional transitions only (no decorative loops). Shared tokens on `.app-layout`: `, motion-duration-fast` (150ms), `, motion-duration-micro` (200ms), `, motion-duration-panel` (280ms), `, motion-duration-shelf` (260ms). Svelte `fly`/`slide`/`fade` helpers in `src/lib/motion.ts` zero durations when `prefers-reduced-motion: reduce`.

## Basemap palette

Campus map tiles use `public/liberty-customized.json` (OSM Liberty / MapTiler vector tiles). Eye-strain tuning lives in `src/constants/map-basemap-palette.ts` and is applied at runtime via `applyBasemapPalette()` in `Map.svelte` (also mirrored in the JSON for offline downloads). Adjust grass, water, building extrusions, and road fills there; not map chrome tokens on `.app-layout`. A full dark or muted theme would need a separate style variant and user setting.
