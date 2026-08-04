// One-tap day route (#839): the predicate and action shared by the /today
// "Route my day" button and the status-bar chip, so the two surfaces can
// never disagree about when a day is routable.

import { WEEKDAYS, type Weekday } from "./schedule-import/types";
import { plannerStore, scheduleRouteStore, termStore } from "./store.svelte";
import { formatTermDateRange, isDateWithinTerm } from "./term-calendar";
import { buildAgenda } from "./today-agenda";

/**
 * Today's weekday token when the active plan has classes today; null hides
 * or disables the day-route surfaces. Mirrors TodayScreen's off-term note:
 * a plan for a term that is not in session has nothing to attend today.
 */
export function routableTodayWeekday(): Weekday | null {
  const term = termStore.activeTerm;
  if (
    term &&
    !isDateWithinTerm(term, new Date()) &&
    formatTermDateRange(term)
  ) {
    return null;
  }
  const sections = plannerStore.activePlan?.sections ?? [];
  if (sections.length === 0) return null;
  const today = buildAgenda(sections, { days: 1 })[0];
  if (!today || today.dayIndex === null || today.entries.length === 0) {
    return null;
  }
  return WEEKDAYS[today.dayIndex] ?? null;
}

/**
 * Route today's classes on the map; true when a route actually drew.
 * Always re-imports the plan: the schedule-route store may hold a stale plan
 * (or nothing) when its panel was never opened this session. Failures speak
 * through the store's own toasts.
 */
export async function routeToday(): Promise<boolean> {
  const weekday = routableTodayWeekday();
  if (weekday === null) return false;
  if (!(await scheduleRouteStore.importFromPlanner())) return false;
  scheduleRouteStore.routeDay(weekday);
  return scheduleRouteStore.routedWeekday === weekday;
}
