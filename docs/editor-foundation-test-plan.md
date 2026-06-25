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

## Room Side-Panel Editing

- Non-admin users only see read-only room details in the existing main app side panel.
- Admin users see compact inline room editor fields after logging in through the in-app editor login.
- Updating room code saves with the current room `version` and keeps the side panel on the edited room.
- Updating room directions saves with the current room `version` and shows lightweight inline success feedback.
- Updating building, college, and division relationships saves with the current room `version`.
- A failed room save names the room and the field context when possible.
- A stale room `version` returns a conflict, shows the latest server room data, and does not silently overwrite it.
- Successful room updates create an `editor_history` row with before/after snapshots and version numbers.
- Successful room updates refresh the `rooms` sync key.
- A room with an associated building shows a compact action that navigates back to that building result.
- Browser `/admin` and `/admin/login` routes still redirect to `/?editor=login`.

## 3D Room Position Editing

- Non-admin users can open the 3D building viewer but do not see room position editor controls.
- Reopening the same building after its first successful load uses the cached OSM footprint instead of waiting on a new Overpass request.
- Admin users can enable 3D room position edit mode from the existing building viewer.
- Dragging a room marker keeps it on its current floor and autosaves the new position.
- Changing a selected room floor autosaves the new floor and keeps the floor filter understandable.
- Autosaved room positions send the current room `version` for each edited room.
- Successful 3D room position autosaves update the local room version, create an `editor_history` row with before/after position snapshots, and refresh the `rooms` sync key.
- A stale room `version` returns a conflict, rolls the marker back to the latest known saved position, and shows that the room has newer server data instead of silently overwriting it.
- Failed position autosaves roll the marker back to its previous local position and do not show a success message for the failed room.

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
- On room side-panel conflicts, the fields update to the latest saved room details.
- Missing client versions are accepted during rollout and return a fresh version in the response.

## Version History

- Building updates create an `editor_history` row.
- Dorm updates create an `editor_history` row.
- Room updates create an `editor_history` row.
- History rows include `entity_type`, `entity_id`, `action`, `before_snapshot`, `after_snapshot`, `version_before`, `version_after`, `edited_by`, and `created_at`.
- Reverts in future PRs should create new history rows rather than mutating old history.
