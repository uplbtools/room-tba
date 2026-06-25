# Map UI mode matrix

Source of truth for which map chrome is visible in each mode.

| Mode                          | Search dropdown | Event banner | Events shelf | Map tools      | Edit dock             | Sync UI    |
| ----------------------------- | --------------- | ------------ | ------------ | -------------- | --------------------- | ---------- |
| Browse                        | yes             | yes          | yes          | closed default | hidden                | status bar |
| Browse (search collapsed)     | on expand       | on expand    | on expand    | closed default | hidden                | status bar |
| Edit (`mapEditStore.enabled`) | **no**          | **no**       | **no**       | closed default | **yes (mobile dock)** | status bar |
| Event placement               | **no**          | **no**       | **no**       | closed default | cancel dock           | status bar |
| Terrain / jeepney active      | yes             | yes          | yes          | flyout section | hidden                | status bar |

Implementation: `getMapChromeVisibility()` in `src/lib/map-chrome.ts`.

## Layout zones (Entry.svelte)

- **Top band:** search column, event banner, Map tools trigger
- **Map face:** map canvas, location/editor FAB
- **Bottom band:** status bar, edit dock (when editing), drawer host
- **Ephemeral:** toast, modals

New map chrome must mount in a named zone in `Entry.svelte` or its children. Do not add new `position: fixed` surfaces inside `Map.svelte` except map-attached pins/markers and the edit dock.

## CSS anchors (on `.app-layout`)

- `--map-ui-padding`
- `--search-block-height`
- `--status-bar-block-height`
- `--drawer-peek-offset`
- `--edit-bar-height` (non-zero when editing)

Use these instead of magic `bottom` / `top` values.

## Verification viewports

320px, 768px, desktop — browse, edit mode, map tools open, sync active.
