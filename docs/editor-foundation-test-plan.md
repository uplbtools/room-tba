# Editor Foundation Manual Test Plan

Use this checklist before merging the in-app editor foundation PR.

## Admin Entry

- Visiting `/admin` redirects to `/?editor=login`.
- Visiting `/admin/login` redirects to `/?editor=login`.
- `/?editor=login` opens the in-app editor login modal.
- **Editor sign in** in the status bar (expand Status on mobile) also opens the login modal.
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

## Terrain Mode

- The Makiling terrain control is reachable inside the Map tools flyout.
- Terrain mode is off by default and does not request hosted elevation tiles before it is enabled.
- Enabling terrain loads the hosted DEM layer, expands the map bounds toward Mt. Makiling, and moves to the Makiling terrain view.
- Turning terrain off restores the flat campus map bounds and leaves building, dorm, jeepney, and location markers usable.
- Exaggeration controls update the terrain without clearing the current search or route state.
- Reset view returns to the Makiling terrain camera without clearing the current search.
- Offline mode shows terrain as unavailable and keeps the flat map usable.
- Failed or blocked terrain tile requests do not leave the control implying terrain is active.
- MapTiler attribution/logo remains visible when terrain is active.
- On a low-bandwidth or data-saver connection, terrain copy warns that hosted elevation tiles are online-only.
- Terrain controls live inside the Map tools flyout (collapsed by default) and do not cover the side panel, editor dock, or attribution.
- Jeepney route chips live in the search filter row alongside building type filters; selecting a route highlights the chip and draws the route on the map.
- Sync progress appears in the status bar only; no floating sync card on the map face.
- PWA reload prompt appears as an action in the status bar.

## Building Type Filter

- The building type filter defaults to All and shows the same building pins and suggestions as before.
- Selecting Class Building shows only red building pins and building suggestions.
- Selecting UP Managed Dorm shows only green UP-managed dorm pins and dorm suggestions.
- Selecting Non-UP Managed Dorm shows only orange non-UP-managed dorm pins and dorm suggestions.
- A search with no matching buildings or dorms under the active building type filter keeps the existing empty/query fallback understandable.
- In map edit mode, only visible building pins are draggable, and changing the filter does not imply hidden pins were edited.

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

See also `docs/map-ui-mode-matrix.md` for chrome visibility by mode. Verify at **320px** and **768px**.

- The app includes a mobile viewport with `initial-scale=1`.
- The editor login modal fits on a narrow viewport without clipping.
- Map tools flyout is reachable and tappable; mobile View section shows Pins + 2D/3D only (pinch handles camera on touch).
- Desktop: rotate/tilt/compass controls sit on the map face below the layers button, not inside the flyout.
- Location/editor FAB clears the drawer handle, status bar, and edit dock.
- Search suggestions and event banner are hidden during map edit mode.
- Search bar can collapse to a compact tab; expanding restores query, selection, and side-panel state without moving the map.
- Mobile edit dock (Undo / Redo) sits above the status bar with 44px touch targets; no keyboard-hint copy.
- Touch-dragging a pin repositions the pin without excessive accidental map panning.
- Only selected/active/saving pins show the Move affordance; not every pin at once.
- Failed save and rollback feedback remains readable on a narrow viewport.
- Zero events: campus events shelf/tab and “Browse campus events” remain reachable.

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

## Contributor edit proposals (#208)

- Anyone can open **Suggest an edit** on building, college, division, dorm, room, and event panels without changing live data.
- Map pin moves for buildings, dorms, and events (custom primary marker) use **enable pin move** → drag → submit for review.
- Submissions create or update a pending row in `edit_proposals`; anonymous users provide a display name.
- Editors/admins review from the shield menu queue: approve publishes atomically (entity + history + sync key), reject/request-changes stores a note.
- Approval conflicts (`409`) leave the proposal open; the admin sees an error instead of a false success.
- Event deactivate and map-center placement remain direct-publish for editors only.

## Multi-user editor auth (#203)

- Two distinct admin users can sign in with different usernames and passwords.
- Disabled users (`is_active = false`) receive 401 on login.
- Admin writes store the signed-in username/display name in `editor_history.edited_by`.
- Session cookie remains httpOnly; `/admin` still redirects to in-app login.
- Legacy `ADMIN_PASSWORD`-only login bootstraps user `admin` when `admin_users` is empty.

## Version History

- Building updates create an `editor_history` row.
- Dorm updates create an `editor_history` row.
- Room updates create an `editor_history` row.
- History rows include `entity_type`, `entity_id`, `action`, `before_snapshot`, `after_snapshot`, `version_before`, `version_after`, `edited_by`, and `created_at`.
- Reverts in future PRs should create new history rows rather than mutating old history.
