# Map UI mode matrix

Source of truth for which map chrome is visible in each mode.

| Mode                          | Search dropdown | Event banner | Events shelf | Map tools      | Building filters   | Edit dock             | Sync UI    | Map attribution |
| ----------------------------- | --------------- | ------------ | ------------ | -------------- | ------------------ | --------------------- | ---------- | --------------- |
| Browse                        | yes             | yes          | yes          | closed default | **yes (chip bar)** | hidden                | status bar | bottom band     |
| Browse (search collapsed)     | on expand       | on expand    | on expand    | closed default | **yes (chip bar)** | hidden                | status bar | bottom band     |
| Edit (`mapEditStore.enabled`) | **no**          | **no**       | **no**       | closed default | **no**             | **yes (mobile dock)** | status bar | bottom band     |
| Event placement               | **no**          | **no**       | **no**       | closed default | **no**             | cancel dock           | status bar | bottom band     |
| Terrain / jeepney active      | yes             | yes          | yes          | flyout section | **yes (chip bar)** | hidden                | status bar | bottom band     |

Implementation: `getMapChromeVisibility()` in `src/lib/map-chrome.ts`.

## Layout zones (Entry.svelte)

- **Top band:** search column (editor icon button when signed in), building pin filter chips (`BuildingTypeFilterBar.svelte`), event banner, Map tools trigger; mobile chip row includes compact `MapDimensionToggle` (2D/3D only). On mobile (≤48rem), the editor icon opens a full-screen editor dashboard (`EditorScreen.svelte`) instead of an inline shelf under the chip row.
- **Map face:** map canvas, desktop unified camera column (`camera-controls-card`: vertical 2D/3D + rotate/tilt/north), location FAB (+ contributor propose FAB when signed in)
- **Bottom band:** status bar, map attribution (`MapAttribution.svelte`), location FAB (fixed above status bar)
- **Ephemeral:** toast, modals, mobile editor screen (`EditorScreen.svelte` when `editorChromeStore.shelfOpen`)

MapLibre attribution is disabled on the map canvas (`attributionControl={false}`). Required basemap credits live in `MapAttribution` on the bottom band so they stay visible above the mobile detail sheet.

## CSS anchors (on `.app-layout`)

- `--map-ui-padding`
- `--search-block-height`
- `--status-bar-block-height`
- `--drawer-peek-offset`
- `--mobile-detail-sheet-top-inset` (mobile entity detail sheet; below search app bar)
- `--map-ui-padding` is `0` on mobile (edge-to-edge chrome)
- `--edit-bar-height` (non-zero when editing)

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

## Verification viewports

320px, 768px, desktop — browse, edit mode, map tools open, sync active.
