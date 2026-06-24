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
