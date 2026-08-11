# Map UI mode matrix

Source of truth for which map chrome is visible in each mode.

| Mode                          | Search dropdown | Event banner | Events shelf | Settings / legend | Pin filters | Edit dock             | Sync UI    | Map attribution |
| ----------------------------- | --------------- | ------------ | ------------ | ----------------- | ----------- | --------------------- | ---------- | --------------- |
| Browse                        | yes             | yes          | yes          | closed default    | chip rows + App menu | hidden                | status bar | bottom band     |
| Browse (search collapsed)     | on expand       | on expand    | on expand    | closed default    | chip rows + App menu | hidden                | status bar | bottom band     |
| Edit (`mapEditStore.enabled`) | **no**          | **no**       | **no**       | closed default    | **no**      | **yes (mobile dock)** | status bar | bottom band     |
| Event placement               | **no**          | **no**       | **no**       | closed default    | **no**      | cancel dock           | status bar | bottom band     |
| Terrain active                | yes             | yes          | flyout section | Settings modal   | chip rows + App menu | hidden                | status bar | bottom band     |
| Transit active                | yes             | yes          | yes          | legend available  | chip rows + App menu | hidden                | status bar | bottom band     |
| Travel time active (#847)     | yes             | yes          | yes          | closed default    | chip rows + App menu | hidden                | status bar | bottom band     |
| Measure route active (#848)   | yes             | yes          | yes          | closed default    | chip rows + App menu | hidden                | status bar | bottom band     |
| Directions active             | yes (+ Add stop on pill / result rows; stop list under search) | yes | yes | closed default | hidden while active | hidden | status bar | bottom band |

Directions opens the mobile sheet at **peek**. Stop sequence (origin / waypoints / destination) lives under the search bar; the sheet only shows route options + Show on map / Start.

Implementation: `getMapChromeVisibility()` in `src/lib/map-chrome.ts`.

## Browse and map-tools exclusivity

Only one browse overlay from the chip row is active at a time (except **All** pins, the neutral default):

- **Transit on** → building/dorm pin filter resets to **All** (`jeepneyStore.enableLayer` sets `buildingTypeFilter` to `"all"`). Map tools owns the transit toggle and route picker.
- **Non-All pin filter selected** (Class / Admin / UP dorms / Other dorms) → transit layer + selected route/stop turn off (`BuildingTypeFilterBar.selectFilter` calls `jeepneyStore.disableLayer`).
- **Events shelf** ↔ Transit exclusivity is unchanged (`openEventsShelf` disables transit; transit active closes the events shelf).
- **All** is neutral: selecting it does not touch transit.
- Edit/terrain exclusivity via `deactivateMapModesExcept` is unchanged; Travel time (#847) and Measure route (#848) register as the `travel-time` / `measure` exclusive modes since they own map clicks.

Term-chip exclusivity: opening the term picker closes the map tools flyout (and vice versa) so top-band popovers do not stack on mobile.

## Overlay stacking (`.app-layout` tokens)

Lowest to highest:

| Layer                     | Token / value            | Surfaces                                       |
| ------------------------- | ------------------------ | ---------------------------------------------- |
| Map canvas                | `--z-map: 0`             | MapLibre canvas                                |
| Side panel                | `--z-side-panel: 2`      | MainControls drawer                            |
| Bottom chrome             | `--z-status-bar: 5`      | Status bar tray                                |
| UI shell                  | `10` (`.ui-layer`)       | Search, side panel host                        |
| Drawer-lift FABs          | `14`                     | Location button when sheet open                |
| Map tools (mobile)        | `--z-map-tools: 16`      | Map tools flyout stack                         |
| Chrome popovers           | `--z-chrome-popover: 17` | Term picker, offline maps (portaled to `body`) |
| Edit dock / editor screen | `18`                     | Map edit toolbar                               |
| Browse modals             | `--z-modal: 100`         | Landing, schedule expand                       |
| Login / editor addition   | `--z-login-modal: 200`   | Admin login (closes browse modals on open)     |
| Toast                     | `--z-toast: 1000`        | App-layout sibling (above edit dock)           |

Portaled popovers use `use:portal` so they are not trapped in the bottom-chrome stacking context. Editor login closes browse modals before opening.

## Layout zones (Entry.svelte)

- **Top band:** search column (editor icon button when signed in), term selector, and event banner. Map-filter chips open Buildings, Dorms, Divisions, Units & offices, Landmarks, Services & establishments, Events, and Jeepney routes. The App Menu opens Colleges, Student organizations, and Classes. Each directory opens its own `CampusBrowseList.svelte` view in the side drawer and an entry then opens the regular entity detail view; they are not centered modals. The search suggestions dropdown is for recent searches and typed results only. **Keyboard shortcuts** are opened from the App Menu or the `?` key. Editor tools open in a modal.
- **Map face:** map canvas, desktop unified camera column (`camera-controls-card`: vertical 2D/3D + rotate/tilt/north). Satellite remains in Map tools → View and Settings → View.
- **Bottom band:** unified bottom chrome tray (`.bottom-chrome` in `Entry.svelte`); attribution leading, status center, compact Map tools + Legend chips plus location/propose actions trailing; one shared surface. The Map tools chip opens `MapToolsFlyout` (`mapToolsStore`) with the travel tools; while Travel time is active its minutes legend stacks above the tray as the bottom band's first child.
- **Ephemeral:** toast and modals

MapLibre attribution is disabled on the map canvas (`attributionControl={false}`). Required basemap credits live in `MapAttribution` on the bottom band so they stay visible above the mobile detail sheet. `© OpenStreetMap` and `© MapTiler` stay visible without a click; OpenMapTiles and the longer OSM wording sit behind the info control.

## CSS anchors (on `.app-layout`)

- `--map-ui-padding`
- `--map-search-inline-pad` (mobile search bar horizontal inset; defaults with `--map-ui-padding`)
- `--search-block-height`
- `--status-bar-block-height` (measured from full `.bottom-chrome` tray)
- `--side-panel-top-inset` (search block + map padding; desktop fixed drawer top)
- `--side-panel-bottom-inset` (measured from `.bottom-chrome` top edge + `--side-panel-bottom-gap`; fixed drawer/sheet bottom; in map edit mode also adds `--edit-bar-height` + `--bottom-fab-gap` so the mobile peek tab clears the edit dock)
- `--side-panel-bottom-inset-measured` (runtime px distance from viewport bottom to status tray top; set in `Entry.svelte`)
- `--side-panel-bottom-gap` (extra clearance between drawer and status tray)
- `--drawer-peek-offset`
- `--mobile-detail-sheet-top-inset` (mobile entity detail sheet; below search app bar)
- `--map-ui-padding` is `0.375rem` horizontal on mobile (search + drawer gutter; bottom band stays edge-to-edge)
- `--mobile-detail-sheet-gap` (vertical space between measured search block and mobile detail sheet)
- Mobile detail sheet inset horizontally by `--map-ui-padding`; rounded card, not viewport-bleed
- `--bottom-fab-inset` (measured from `.bottom-chrome__actions` width + `--bottom-chrome-gap`; reserves space for edit dock right edge)
- `--bottom-chrome-gap` (gap between bottom chrome and edit dock; defaults to `--bottom-fab-gap`)
- `--bottom-fab-gap` (spacing between bottom chrome and edit dock)
- `--edit-bar-height` (measured edit dock height; non-zero when editing; set via ResizeObserver in `Map.svelte`)

Use these instead of magic `bottom` / `top` values.

## Side panel zones (MainControls drawer)

Entity detail views (`RoomResult`, `BuildingResult`, `DormResult`, etc.) use shared layout from `controls/entity-detail.css`:

| Zone       | Contents                                                                                             |
| ---------- | ---------------------------------------------------------------------------------------------------- |
| Header     | Breadcrumb (optional), title + badge, context line, **one** actions row (Copy link, Edit, nav chips) |
| Body       | Browse text; editor panel expands inline when Edit is open                                           |
| Directions | Merged directions text + suggest links + Directions / Google Maps chips                              |
| Footer     | Secondary links only (e.g. classes schedule, external refs)                                          |

Do not add duplicate action rows or colored highlight boxes. See `.cursor/rules/side-panel.mdc`.

On mobile, browse and entity drawers open above the map and do not obscure the bottom navigation. Closing the drawer returns to the map.

## Verification viewports

320px, 768px, desktop; browse, edit mode, map tools open, sync active.

## Motion

Functional transitions only (no decorative loops). Shared tokens on `.app-layout`: `--motion-duration-fast` (150ms), `--motion-duration-micro` (200ms), `--motion-duration-panel` (280ms), `--motion-duration-shelf` (260ms). Svelte `fly`/`slide`/`fade` helpers in `src/lib/motion.ts` zero durations when `prefers-reduced-motion: reduce`.

## Basemap palette

Campus map tiles use `public/liberty-customized.json` (OSM Liberty / MapTiler vector tiles). Eye-strain tuning lives in `src/constants/map-basemap-palette.ts` and is applied at runtime via `applyBasemapPalette()` in `Map.svelte` (also mirrored in the JSON for offline downloads). Adjust grass, water, building extrusions, and road fills there; not map chrome tokens on `.app-layout`. A full dark or muted theme would need a separate style variant and user setting.
