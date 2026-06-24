# Editor Foundation Manual Test Plan

Use this checklist before merging the in-app editor foundation PR.

## Admin Entry

- Visiting `/admin` redirects to `/?editor=login`.
- Visiting `/admin/login` redirects to `/?editor=login`.
- `/?editor=login` opens the in-app editor login modal.
- A successful login updates the map controls to show the admin/editor controls.
- Signing out disables map edit mode.

## Map Editing

- The pencil control toggles map edit mode on and off.
- Edit mode shows the compact editor toolbar without overlapping the toast area.
- Building and dorm pins are draggable only while edit mode is enabled.
- Dragging a building saves its new location.
- Dragging a dorm saves its new location.
- A successful save updates the inline editor toolbar status.
- A failed save restores the pin to its previous location and shows the entity name in the error.

## Side Panel Editing

- Non-admin users see the existing read-only building and dorm result details.
- Signed-in admins do not see side-panel edit fields until map edit mode is enabled.
- In edit mode, building results expose inline edits for name, type, and directions.
- In edit mode, dorm results expose inline edits for dorm metadata, contact details, description, pricing, and amenities.
- Each field save sends only the changed field plus the entity `version` to `/api/admin/buildings/[id]` or `/api/admin/dorms/[id]`.
- A successful field save shows lightweight inline "Saved" feedback and updates the visible version.
- A failed field save names the entity and field that failed.
- A stale-version `409 Conflict` replaces the panel values with the latest server data and tells the editor to review before saving again.
- Successful building and dorm field saves create `editor_history` rows and refresh the matching sync key.
- Building name and dorm name edits keep the side panel on the renamed entity.
- Side-panel edit fields stay compact and tappable on a narrow mobile viewport.
- Browser `/admin` and `/admin/login` still redirect to `/?editor=login` instead of dashboard pages.

## Mobile Editor QA

- The app includes a mobile viewport with `initial-scale=1`.
- The editor login modal fits on a narrow viewport without clipping.
- Map controls are reachable and tappable on a narrow viewport.
- The editor toolbar stays readable and does not cover the search/side panel.
- Undo and Redo buttons remain large enough to tap comfortably.
- Touch-dragging a pin repositions the pin without excessive accidental map panning.
- Mobile users can identify draggable pins without relying on hover-only labels.
- Failed save and rollback feedback remains readable on a narrow viewport.

## Undo And Redo

- The Undo button restores the most recent saved pin move.
- The Redo button reapplies the most recently undone move.
- `Ctrl+Z` / `Cmd+Z` triggers undo.
- `Ctrl+Y` / `Cmd+Y` triggers redo.
- `Shift+Ctrl+Z` / `Shift+Cmd+Z` also triggers redo.
- Undo/redo failures show an error and do not leave the marker in a misleading position.

## Concurrent Editing

- Saving with a stale version returns a conflict instead of overwriting another editor's change.
- On conflict, the marker moves to the latest server position.
- Missing client versions are accepted during rollout and return a fresh version in the response.

## Version History

- Building updates create an `editor_history` row.
- Dorm updates create an `editor_history` row.
- History rows include `entity_type`, `entity_id`, `action`, `before_snapshot`, `after_snapshot`, `version_before`, `version_after`, `edited_by`, and `created_at`.
- Reverts in future PRs should create new history rows rather than mutating old history.
