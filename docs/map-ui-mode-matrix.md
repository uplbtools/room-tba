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

- **Top band:** search column, building pin filter chips (`BuildingTypeFilterBar.svelte`), **Editor chip + shelf** (signed-in editors), event banner, Map tools trigger
- **Map face:** map canvas, desktop `MapDimensionToggle` + camera stack (`MapViewControls variant="camera"` — rotate/tilt/north), mobile `MapDimensionToggle`, location/editor FAB
- **Bottom band:** status bar, map attribution (`MapAttribution.svelte`), location/editor FAB
- **Ephemeral:** toast, modals

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

## Verification viewports

320px, 768px, desktop — browse, edit mode, map tools open, sync active.
