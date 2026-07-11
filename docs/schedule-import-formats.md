# Personal schedule routing (planner-sourced)

The day-route feature in Map tools → Schedule reads the **active Planner plan**
for the current term. There is no paste/import step anymore: the AMIS Schedule
Extractor / CSV import was removed in July 2026 once the Planner could hold a
personal schedule natively.

## Data flow

1. `plannerStore.activePlan.sections` (localStorage, `room-tba-planner`) are
   loaded as schedule rows (`courseCode` + `section` + `type` + `schedule`).
2. Rows match institutional `classes` for the active term
   (`course_code` + `section` + `type`).
3. Room codes resolve to building coordinates via local PGlite cache or
   `/api/rooms`.
4. Unresolved rows (no match, no room, thesis/special-problem types) appear in
   the UI but are skipped for routing.
5. The selected weekday renders numbered class-stop pins on the map; routing
   the day connects those stops with the foot-route layer.
6. Only the selected weekday persists in `sessionStorage`; the schedule itself
   always re-derives from the Planner.

Schedule slots use the same compact AMIS format parsed by
`parseScheduleTime()` in `src/lib/schedule-renderer.ts`
(e.g. `TTh 01:00PM-02:30PM`).

## Related code

- Matcher: `src/lib/schedule-import/match-classes.ts`
- Weekday ordering: `src/lib/schedule-import/day-stops.ts`
- UI: Map tools flyout → Schedule → `ScheduleImportPanel.svelte`
- Store: `scheduleRouteStore.importFromPlanner()` in `src/lib/store.svelte.ts`
- Planner model: `src/lib/planner/types.ts`
