<script lang="ts">
  import CalendarDays from "@lucide/svelte/icons/calendar-days";
  import ChevronLeft from "@lucide/svelte/icons/chevron-left";
  import MapPin from "@lucide/svelte/icons/map-pin";
  import Route from "@lucide/svelte/icons/route";
  import { fly } from "svelte/transition";
  import { MediaQuery } from "svelte/reactivity";
  import { formatDistance, formatDuration } from "@lib/campus-route";
  import { trapFocus } from "@lib/focus-trap";
  import { fullScreenReveal } from "@lib/motion";
  import { WEEKDAYS } from "@lib/schedule-import/types";
  import {
    locationStore,
    plannerStore,
    queryStore,
    scheduleRouteStore,
    sidebarStore,
    termStore,
  } from "@lib/store.svelte";
  import { buildAgenda } from "@lib/today-agenda";
  import { routableTodayWeekday, routeToday } from "@lib/today-route";
  import { formatTermDateRange, isDateWithinTerm } from "@lib/term-calendar";

  const reducedMotion = new MediaQuery("(prefers-reduced-motion: reduce)");

  let screenEl = $state<HTMLDivElement | null>(null);

  // Read-only over the planner's saved plan for the active term (#774).
  const sections = $derived(plannerStore.activePlan?.sections ?? []);
  const hasPlan = $derived(sections.length > 0);
  const activeSections = $derived(offTermNote ? [] : sections);
  const days = $derived(buildAgenda(activeSections));

  // A plan for a term that is not in session would otherwise read as "you have
  // nothing all week"; say which window the term actually covers instead.
  const offTermNote = $derived.by(() => {
    const term = termStore.activeTerm;
    if (!term || isDateWithinTerm(term, new Date())) return null;
    const range = formatTermDateRange(term);
    return range ? `${term.label} runs ${range}.` : null;
  });

  // Header date, campus time: the screen is "Today", so say which day it is.
  const todayLabel = new Date().toLocaleDateString("en-PH", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Manila",
  });

  function close() {
    sidebarStore.changeOpened("map");
  }

  // One-tap day route (#839): predicate + action shared with the status-bar
  // chip via today-route.ts, mapped onto the schedule-route weekday plumbing
  // the Map tools flyout already uses.
  const today = $derived(days[0] ?? null);
  const todayWeekday = $derived(
    today?.dayIndex == null ? null : (WEEKDAYS[today.dayIndex] ?? null),
  );
  const canRouteToday = $derived(routableTodayWeekday() !== null);
  // No plan: the empty state below says what to do; the route button stays
  // hidden until there is something to route.
  const routeHint = $derived.by(() => {
    if (canRouteToday || !hasPlan) return null;
    if (todayWeekday === null) return "No classes on Sundays.";
    return "No classes to route today.";
  });
  const routedToday = $derived(
    todayWeekday !== null &&
      scheduleRouteStore.routedWeekday === todayWeekday &&
      locationStore.routeWaypoints !== null,
  );
  let routing = $state(false);

  async function routeMyDay() {
    if (routing) return;
    routing = true;
    try {
      // Leave the overlay only when a route actually drew; failures keep the
      // agenda visible with the store's toast explaining why.
      if (await routeToday()) close();
    } finally {
      routing = false;
    }
  }

  // /today?route=1 deep link (flag set by Entry.svelte before this mounts).
  // Consumed only once terms have loaded: the plan is keyed by the active
  // term, so at mount canRouteToday is still false and the flag would drop.
  $effect(() => {
    if (!scheduleRouteStore.pendingDayRoute || !termStore.loaded) return;
    scheduleRouteStore.pendingDayRoute = false;
    if (canRouteToday) void routeMyDay();
  });

  function openRoom(roomCode: string) {
    if (!roomCode) return;
    queryStore.updateQuery({
      type: "result",
      category: "room",
      value: roomCode,
    });
    queryStore.inputValue = roomCode;
    close();
  }

  $effect(() => {
    if (!screenEl) return;
    return trapFocus(screenEl, { onEscape: close });
  });
</script>

<div
  bind:this={screenEl}
  class="today-screen"
  role="dialog"
  aria-modal="true"
  aria-labelledby="today-screen-title"
  in:fly={fullScreenReveal(reducedMotion.current)}
>
  <header class="today-header">
    <button
      type="button"
      class="today-back"
      onclick={close}
      aria-label="Back to map"
      title="Back to map"
    >
      <ChevronLeft size={22} aria-hidden="true" />
    </button>
    <div class="today-heading">
      <h1 class="today-title" id="today-screen-title">Today</h1>
      <p class="today-date">{todayLabel}</p>
    </div>
  </header>

  {#if offTermNote}
    <p class="today-note" role="note">{offTermNote}</p>
  {/if}

  {#if hasPlan}
    <div class="today-route">
      <button
        type="button"
        class="today-route__button"
        disabled={!canRouteToday || routing}
        onclick={routeMyDay}
      >
        <Route size={16} aria-hidden="true" />
        {routing ? "Routing…" : "Route my day"}
      </button>
      {#if routeHint}
        <span class="today-route__hint">{routeHint}</span>
      {:else if routedToday && scheduleRouteStore.routeTotals}
        <span class="today-route__totals">
          {formatDuration(scheduleRouteStore.routeTotals.seconds)} walk ·
          {formatDistance(scheduleRouteStore.routeTotals.meters)}
        </span>
      {/if}
    </div>
  {/if}

  <div class="today-body">
    {#if !hasPlan}
      <div class="today-empty-plan">
        <CalendarDays size={32} aria-hidden="true" />
        <h2 class="today-empty-plan__title">Nothing planned yet</h2>
        <p>Add classes to see your day.</p>
        <button type="button" onclick={() => sidebarStore.changeOpened("planner")}>
          Open the Planner
        </button>
      </div>
    {:else}
      {#each days as day (day.dateKey)}
        <section
          class="today-day"
          class:today-day--now={day.isToday}
          class:today-day--weekend={day.isWeekend}
          aria-label="{day.title}, {day.dateLabel}"
        >
          <h2 class="today-day__heading">
            <span class="today-day__title">{day.title}</span>
            <span class="today-day__date">{day.dateLabel}</span>
          </h2>
          {#if day.entries.length === 0}
            <p class="today-day__empty">{day.emptyLabel}</p>
          {:else}
            <ul class="today-entries">
              {#each day.entries as entry (entry.courseCode + entry.section + entry.type + entry.startMin)}
                <li class="today-entry">
                  <span class="today-entry__time">{entry.timeLabel}</span>
                  <span class="today-entry__main">
                    <span class="today-entry__course">
                      {entry.courseCode}
                      <span class="today-entry__type">{entry.type}</span>
                      <span class="today-entry__section">{entry.section}</span>
                    </span>
                    {#if entry.courseTitle}
                      <span class="today-entry__course-title">
                        {entry.courseTitle}
                      </span>
                    {/if}
                  </span>
                  {#if entry.roomCode}
                    <button
                      type="button"
                      class="today-entry__room"
                      onclick={() => openRoom(entry.roomCode ?? "")}
                      title="Open {entry.roomCode} on the map"
                    >
                      <MapPin size={14} aria-hidden="true" />
                      {entry.roomCode}
                    </button>
                  {:else}
                    <span class="today-entry__room today-entry__room--tba">
                      Room TBA
                    </span>
                  {/if}
                </li>
              {/each}
            </ul>
          {/if}
        </section>
      {/each}
    {/if}
  </div>
</div>

<style>
  .today-screen {
    z-index: 150;
    display: flex;
    flex: 1 1 auto;
    min-width: 0;
    flex-direction: column;
    gap: 0.75rem;
    padding: 1rem 1.25rem calc(1rem + env(safe-area-inset-bottom, 0px));
    background: var(--theme-surface, hsl(0, 0%, 98%));
    pointer-events: auto;
    overflow: hidden;
  }

  /* App bar: icon back button, then title over the date. */
  .today-header {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    margin-left: -0.5rem;
  }

  .today-back {
    all: unset;
    box-sizing: border-box;
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
    justify-content: center;
    width: 2.75rem;
    height: 2.75rem;
    border-radius: 999px;
    color: var(--theme-accent-text, hsl(5, 53%, 32%));
    cursor: pointer;
  }

  .today-back:hover {
    background: var(--theme-accent-soft, hsl(5, 30%, 94%));
  }

  .today-back:focus-visible {
    outline: 2px solid var(--theme-accent-text, hsl(5, 53%, 32%));
  }

  .today-heading {
    min-width: 0;
  }

  .today-title {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 800;
    line-height: 1.2;
    color: var(--theme-text, hsl(0, 0%, 12%));
  }

  .today-date {
    margin: 0;
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--theme-text-2, hsl(0, 0%, 40%));
  }

  .today-note {
    margin: 0;
    max-width: 52rem;
    font-size: 0.8125rem;
    color: var(--theme-text-2, hsl(0, 0%, 40%));
  }

  .today-route {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 0.5rem;
    max-width: 52rem;
  }

  .today-route__button {
    all: unset;
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    padding: 0.4375rem 0.875rem;
    border: 1px solid var(--theme-accent-text, hsl(5, 53%, 32%));
    border-radius: 999px;
    background: var(--theme-accent-fill, hsl(5, 53%, 32%));
    color: #fff;
    font-size: 0.8125rem;
    font-weight: 700;
    cursor: pointer;
  }

  .today-route__button:hover:not(:disabled) {
    background: var(--theme-accent-fill, hsl(5, 53%, 38%));
  }

  .today-route__button:focus-visible {
    outline: 2px solid var(--theme-accent-text, hsl(5, 53%, 32%));
    outline-offset: 2px;
  }

  .today-route__button:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .today-route__hint,
  .today-route__totals {
    font-size: 0.8125rem;
    color: var(--theme-text-2, hsl(0, 0%, 40%));
  }

  .today-route__totals {
    font-weight: 600;
    color: var(--theme-accent-text, hsl(5, 53%, 22%));
  }

  .today-body {
    flex: 1;
    min-width: 0;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding-bottom: 1rem;
  }

  .today-empty-plan {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    margin: auto 0;
    padding: 2rem 1rem;
    text-align: center;
    color: var(--theme-text-2, hsl(0, 0%, 45%));
  }

  .today-empty-plan__title {
    margin: 0;
    font-size: 1rem;
    font-weight: 700;
    color: var(--theme-text, hsl(0, 0%, 15%));
  }

  .today-empty-plan p {
    margin: 0;
    font-size: 0.875rem;
    color: var(--theme-text-2, hsl(0, 0%, 35%));
  }

  .today-empty-plan button {
    all: unset;
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    min-height: 2.75rem;
    margin-top: 0.25rem;
    padding: 0 1.125rem;
    border-radius: 999px;
    background: var(--theme-accent-fill, hsl(5, 53%, 32%));
    color: #fff;
    font-size: 0.875rem;
    font-weight: 700;
    cursor: pointer;
  }

  .today-empty-plan button:hover {
    background: var(--theme-accent-fill, hsl(5, 53%, 38%));
  }

  .today-empty-plan button:focus-visible {
    outline: 2px solid var(--theme-accent-text, hsl(5, 53%, 32%));
    outline-offset: 2px;
  }

  .today-day {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    max-width: 52rem;
    min-width: 0;
  }

  .today-day__heading {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    margin: 0;
    padding: 0.25rem 0;
    font-size: 0.9375rem;
    font-weight: 700;
    color: var(--theme-text, hsl(0, 0%, 20%));
  }

  .today-day--now .today-day__title {
    color: var(--theme-accent-text, hsl(5, 53%, 32%));
  }

  .today-day__date {
    font-size: 0.8125rem;
    font-weight: 500;
    color: var(--theme-text-2, hsl(0, 0%, 45%));
  }

  .today-day__empty {
    margin: 0;
    padding: 0.5rem 0.75rem;
    border: 1px dashed var(--theme-border, hsl(0, 0%, 82%));
    border-radius: 0.625rem;
    font-size: 0.8125rem;
    color: var(--theme-text-2, hsl(0, 0%, 45%));
  }

  /* Weekends read as a different kind of day, not just an empty weekday. */
  .today-day--weekend .today-day__heading {
    color: var(--theme-text-2, hsl(0, 0%, 45%));
  }

  .today-day--weekend .today-day__empty {
    background: var(--theme-surface-2, hsl(0, 0%, 95%));
    border-style: solid;
    border-color: var(--theme-border, hsl(0, 0%, 88%));
  }

  .today-entries {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .today-entry {
    display: grid;
    grid-template-columns: 10rem minmax(0, 1fr) auto;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    border: 1px solid var(--theme-border, hsl(0, 0%, 90%));
    border-radius: 0.625rem;
    background: var(--theme-surface, white);
  }

  .today-entry__time {
    font-size: 0.8125rem;
    font-weight: 700;
    color: var(--theme-text, hsl(0, 0%, 25%));
    font-variant-numeric: tabular-nums;
  }

  .today-entry__main {
    display: flex;
    flex-direction: column;
    min-width: 0;
  }

  .today-entry__course {
    font-size: 0.875rem;
    font-weight: 700;
    color: var(--theme-text, hsl(0, 0%, 15%));
  }

  .today-entry__type,
  .today-entry__section {
    font-size: 0.75rem;
    font-weight: 600;
    color: var(--theme-text-2, hsl(0, 0%, 42%));
  }

  .today-entry__course-title {
    font-size: 0.75rem;
    color: var(--theme-text-2, hsl(0, 0%, 42%));
    overflow-wrap: anywhere;
  }

  .today-entry__room {
    all: unset;
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    justify-self: end;
    min-height: 2rem;
    padding: 0.25rem 0.625rem;
    border: 1px solid var(--theme-accent-border, hsl(5, 53%, 82%));
    border-radius: 999px;
    color: var(--theme-accent-text, hsl(5, 53%, 32%));
    font-size: 0.75rem;
    font-weight: 700;
    cursor: pointer;
  }

  .today-entry__room:hover,
  .today-entry__room:focus-visible {
    background: var(--theme-accent-soft, hsl(5, 53%, 96%));
  }

  .today-entry__room:focus-visible {
    outline: 2px solid var(--theme-accent-text, hsl(5, 53%, 32%));
    outline-offset: 1px;
  }

  .today-entry__room--tba {
    border-color: var(--theme-border, hsl(0, 0%, 85%));
    color: var(--theme-text-2, hsl(0, 0%, 45%));
    cursor: default;
  }

  .today-entry__room--tba:hover {
    background: transparent;
  }

  @media (max-width: 48rem) {
    .today-screen {
      padding: 0.75rem 0.75rem calc(0.75rem + env(safe-area-inset-bottom, 0px));
    }

    /* Stack so a long course title never pushes the room chip off a 320px row. */
    .today-entry {
      grid-template-columns: minmax(0, 1fr) auto;
    }

    .today-entry__time {
      grid-column: 1 / -1;
    }
  }
</style>
