<script lang="ts">
  import ChevronLeft from "@lucide/svelte/icons/chevron-left";
  import { fly } from "svelte/transition";
  import { MediaQuery } from "svelte/reactivity";
  import { getAppData } from "@lib/context";
  import { trapFocus } from "@lib/focus-trap";
  import { fullScreenReveal } from "@lib/motion";
  import {
    appBootstrapStore,
    queryStore,
    sidebarStore,
    sidePanelStore,
    termStore,
  } from "@lib/store.svelte";
  import {
    buildEventTimeline,
    buildYearTimeline,
    currentAcademicYearTerms,
    resolveTermWindow,
    termWindowStatus,
    type TermStatus,
  } from "@lib/academic-calendar";
  import { formatCampusRange } from "@lib/event-time";
  import { formatTermDateRange, toManilaDateKey } from "@lib/term-calendar";
  import { termChipLabel, termFullLabel } from "@lib/term-label";
  import type { EventData, EventRecurrence } from "@lib/types";

  const reducedMotion = new MediaQuery("(prefers-reduced-motion: reduce)");

  // One snapshot per open keeps the screen calm and static.
  const today = new Date();

  let screenEl = $state<HTMLDivElement | null>(null);

  function close() {
    sidebarStore.changeOpened("map");
  }

  $effect(() => {
    if (!screenEl) return;
    return trapFocus(screenEl, { onEscape: close });
  });

  const activeTerms = $derived(termStore.terms.filter((term) => term.isActive));

  const yearTerms = $derived(currentAcademicYearTerms(activeTerms, today));

  const timeline = $derived(buildYearTimeline(yearTerms, today));

  const timelineHeading = $derived(
    yearTerms[0]?.schoolYear
      ? `AY ${yearTerms[0].schoolYear.replace("-", " - ")}`
      : "Academic year",
  );

  const todayLabel = today.toLocaleDateString("en-PH", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "Asia/Manila",
  });

  type CardStatus = TermStatus | "undated";
  const STATUS_LABEL: Record<CardStatus, string> = {
    "in-session": "In session",
    upcoming: "Upcoming",
    past: "Ended",
    undated: "Dates TBA",
  };

  const cards = $derived(
    activeTerms.map((term) => {
      const window = resolveTermWindow(term);
      const status: CardStatus = window
        ? termWindowStatus(window, today)
        : "undated";
      return { term, window, status };
    }),
  );

  const RECURRENCE_LABEL: Partial<Record<EventRecurrence, string>> = {
    annual: "Repeats yearly",
    every_1st_sem: "Every 1st sem",
    every_2nd_sem: "Every 2nd sem",
  };

  const appData = getAppData();
  const events = $derived(appData().events ?? []);
  // appData.loaded flips true on mount with an empty dataset, so it would flash
  // "no events" on every cold load; the bootstrap phase is the honest signal.
  const eventsPending = $derived(
    events.length === 0 &&
      appBootstrapStore.phase !== "ready" &&
      appBootstrapStore.phase !== "error",
  );

  // Occurrences are already projected for recurring events (event-time.ts), so
  // a yearly event lands on the year it next runs.
  const eventTimeline = $derived(
    timeline
      ? buildEventTimeline(
          timeline,
          events.map((event) => ({
            event,
            startsOn: toManilaDateKey(new Date(event.occurrenceStartsAt)),
            endsOn: toManilaDateKey(new Date(event.occurrenceEndsAt)),
          })),
        )
      : null,
  );

  function markerTitle(entries: { event: EventData }[]) {
    return entries
      .map(
        ({ event }) =>
          `${event.title}, ${formatCampusRange(event.occurrenceStartsAt, event.occurrenceEndsAt)}`,
      )
      .join("\n");
  }

  function openEvent(event: EventData) {
    queryStore.updateQuery({
      category: "event",
      type: "result",
      value: event.title,
      eventSlug: event.slug,
    });
    queryStore.inputValue = event.title;
    sidePanelStore.expand();
    close();
  }

  function openEventsList() {
    queryStore.updateQuery({
      category: "events",
      type: "result",
      value: "Campus events",
    });
    queryStore.inputValue = "";
    sidePanelStore.expand();
    close();
  }
</script>

<div
  bind:this={screenEl}
  class="acal-screen"
  role="dialog"
  aria-modal="true"
  aria-labelledby="acal-screen-title"
  in:fly={fullScreenReveal(reducedMotion.current)}
>
  <header class="acal-header">
    <button
      type="button"
      class="acal-back"
      onclick={close}
      aria-label="Back to map"
      title="Back to map"
    >
      <ChevronLeft size={18} aria-hidden="true" />
      <span>Back to map</span>
    </button>
    <h1 class="acal-title" id="acal-screen-title">Academic Calendar</h1>
  </header>

  <p class="acal-note" role="note">
    Community-maintained instructional windows per CRS term. Dates may differ
    from the official UPLB academic calendar — verify with the Office of the
    University Registrar.
  </p>

  <div class="acal-body">
    {#if !termStore.loaded}
      <p class="acal-status" role="status">Loading terms…</p>
    {:else if activeTerms.length === 0}
      <p class="acal-status">No academic terms available.</p>
    {:else}
      {#if timeline}
        <section class="acal-year" aria-label="{timelineHeading} timeline">
          <h2 class="acal-year__heading">{timelineHeading}</h2>
          <div class="acal-strip">
            {#each timeline.months as month (month.startPct)}
              <span class="acal-month" style="left: {month.startPct}%"
                >{month.label}</span
              >
            {/each}
            {#each timeline.segments as segment (segment.term.id)}
              <div
                class="acal-seg acal-seg--{segment.status}"
                style="left: {segment.startPct}%; width: {segment.widthPct}%"
                title="{segment.term.label}: {formatTermDateRange(
                  segment.window,
                )}"
              >
                <span class="acal-seg__label">{termChipLabel(segment.term)}</span>
              </div>
            {/each}
            {#each eventTimeline?.markers ?? [] as marker (marker.leftPct)}
              <span
                class="acal-event-dot"
                class:acal-event-dot--past={marker.events.every(
                  (entry) => entry.event.status === "past",
                )}
                style="left: {marker.leftPct}%"
                title={markerTitle(marker.events)}
                aria-hidden="true"
              >
                {#if marker.events.length > 1}{marker.events.length}{/if}
              </span>
            {/each}
            {#if timeline.todayPct !== null}
              <div
                class="acal-today"
                style="left: {timeline.todayPct}%"
                aria-hidden="true"
              ></div>
            {/if}
          </div>
          <p class="acal-caption">Today: {todayLabel} (Asia/Manila)</p>
        </section>

        <section class="acal-events" aria-label="Campus events in {timelineHeading}">
          <h2 class="acal-year__heading">Campus events in {timelineHeading}</h2>
          {#each eventTimeline?.months ?? [] as group (group.key)}
            <h3 class="acal-events__month">{group.label}</h3>
            <ul class="acal-events__list">
              {#each group.events as entry (entry.event.id)}
                <li>
                  <button
                    type="button"
                    class="acal-event"
                    class:acal-event--past={entry.event.status === "past"}
                    onclick={() => openEvent(entry.event)}
                  >
                    <span class="acal-event__title">{entry.event.title}</span>
                    <span class="acal-event__meta">
                      <span
                        >{formatCampusRange(
                          entry.event.occurrenceStartsAt,
                          entry.event.occurrenceEndsAt,
                        )}</span
                      >
                      <span class="acal-event__category"
                        >{entry.event.category}</span
                      >
                      {#if RECURRENCE_LABEL[entry.event.recurrence]}
                        <span>{RECURRENCE_LABEL[entry.event.recurrence]}</span>
                      {/if}
                    </span>
                  </button>
                </li>
              {/each}
            </ul>
          {:else}
            <p class="acal-status">
              {eventsPending
                ? "Loading campus events…"
                : `No campus events fall inside ${timelineHeading}.`}
            </p>
          {/each}
          {#if eventTimeline && eventTimeline.outOfRangeCount > 0}
            <p class="acal-events__note">
              {eventTimeline.outOfRangeCount}
              {eventTimeline.outOfRangeCount === 1 ? "event falls" : "events fall"}
              outside {timelineHeading}.
              <button type="button" class="acal-link" onclick={openEventsList}>
                See all campus events
              </button>
            </p>
          {/if}
        </section>
      {/if}

      <section class="acal-terms" aria-label="Terms">
        {#each cards as card (card.term.id)}
          <article
            class="acal-card"
            class:acal-card--current={card.status === "in-session"}
          >
            <div class="acal-card__head">
              <h3 class="acal-card__label">{termFullLabel(card.term)}</h3>
              <span class="acal-badge acal-badge--{card.status}"
                >{STATUS_LABEL[card.status]}</span
              >
            </div>
            <p class="acal-card__meta">
              <span>CRS {card.term.id}</span>
              {#if card.window}
                <span>{formatTermDateRange(card.window)}</span>
              {/if}
              {#if card.term.classCount > 0}
                <span>{card.term.classCount} classes campus-wide</span>
              {/if}
            </p>
          </article>
        {/each}
      </section>
    {/if}
  </div>
</div>

<style>
  .acal-screen {
    z-index: 150;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 1rem 1.25rem calc(1rem + env(safe-area-inset-bottom, 0px));
    background: hsl(0, 0%, 98%);
    flex: 1 1 auto;
    pointer-events: auto;
    overflow: hidden;
  }

  .acal-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .acal-back {
    all: unset;
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.875rem;
    font-weight: 600;
    color: hsl(5, 53%, 32%);
    cursor: pointer;
    border-radius: 0.5rem;
    padding: 0.25rem 0.5rem;
  }

  .acal-back:hover {
    background: hsl(5, 30%, 94%);
  }

  .acal-back:focus-visible {
    outline: 2px solid hsl(5, 53%, 32%);
  }

  .acal-title {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 800;
    color: hsl(0, 0%, 12%);
  }

  .acal-note {
    margin: 0;
    font-size: 0.8125rem;
    color: hsl(0, 0%, 40%);
    max-width: 52rem;
  }

  .acal-body {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 1.25rem;
    padding-bottom: 1rem;
  }

  .acal-status {
    margin: 0;
    font-size: 0.875rem;
    color: hsl(0, 0%, 40%);
  }

  .acal-year {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    max-width: 52rem;
  }

  .acal-year__heading {
    margin: 0;
    font-size: 0.9375rem;
    font-weight: 700;
    color: hsl(0, 0%, 20%);
  }

  .acal-strip {
    position: relative;
    height: 4rem;
    border: 1px solid hsl(0, 0%, 88%);
    border-radius: 0.625rem;
    background: white;
  }

  .acal-month {
    position: absolute;
    top: 0.25rem;
    padding-left: 0.1875rem;
    border-left: 1px solid hsl(0, 0%, 90%);
    height: calc(100% - 0.5rem);
    font-size: 0.5625rem;
    font-weight: 600;
    color: hsl(0, 0%, 55%);
    line-height: 1;
    pointer-events: none;
  }

  .acal-seg {
    position: absolute;
    bottom: 0.375rem;
    height: 1.75rem;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 0.375rem;
    overflow: hidden;
  }

  .acal-seg--past {
    background: hsl(0, 0%, 90%);
    color: hsl(0, 0%, 35%);
  }

  .acal-seg--upcoming {
    background: hsl(5, 30%, 92%);
    color: hsl(5, 40%, 30%);
  }

  .acal-seg--in-session {
    background: hsl(5, 53%, 32%);
    color: white;
  }

  .acal-seg__label {
    font-size: 0.625rem;
    font-weight: 700;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    padding: 0 0.25rem;
  }

  /* Markers snap to a 5% grid (EVENT_MARKER_STEP_PCT), so this dot must stay
     narrower than 5% of the strip at 320px (~15px) or clusters can touch. */
  .acal-event-dot {
    position: absolute;
    top: 0.9rem;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    justify-content: center;
    width: 0.75rem;
    height: 0.75rem;
    border-radius: 999px;
    background: hsl(30, 85%, 45%);
    color: white;
    font-size: 0.5rem;
    font-weight: 800;
    line-height: 1;
  }

  .acal-event-dot--past {
    background: hsl(0, 0%, 62%);
  }

  .acal-today {
    position: absolute;
    top: 0;
    bottom: 0;
    width: 2px;
    background: hsl(210, 80%, 45%);
  }

  .acal-caption {
    margin: 0;
    font-size: 0.6875rem;
    font-weight: 600;
    color: hsl(210, 60%, 35%);
  }

  .acal-events {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    max-width: 52rem;
  }

  .acal-events__month {
    margin: 0.25rem 0 0;
    font-size: 0.75rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: hsl(0, 0%, 45%);
  }

  .acal-events__list {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .acal-event {
    all: unset;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    width: 100%;
    padding: 0.5rem 0.75rem;
    border: 1px solid hsl(0, 0%, 88%);
    border-radius: 0.625rem;
    background: white;
    cursor: pointer;
  }

  /* Past events stay in the calendar, just quieter than what is still ahead. */
  .acal-event--past {
    background: hsl(0, 0%, 97%);
  }

  .acal-event--past .acal-event__title {
    color: hsl(0, 0%, 38%);
  }

  .acal-event:hover {
    background: hsl(30, 60%, 97%);
  }

  .acal-event:focus-visible {
    outline: 2px solid hsl(5, 53%, 32%);
    outline-offset: -2px;
  }

  .acal-event__title {
    font-size: 0.875rem;
    font-weight: 700;
    color: hsl(0, 0%, 16%);
    overflow-wrap: anywhere;
  }

  .acal-event__meta {
    display: flex;
    flex-wrap: wrap;
    gap: 0.125rem 0.625rem;
    font-size: 0.75rem;
    color: hsl(0, 0%, 42%);
  }

  .acal-event__category {
    text-transform: capitalize;
  }

  .acal-events__note {
    margin: 0.25rem 0 0;
    font-size: 0.75rem;
    color: hsl(0, 0%, 45%);
  }

  .acal-link {
    all: unset;
    color: hsl(5, 53%, 32%);
    font-weight: 700;
    cursor: pointer;
    text-decoration: underline;
  }

  .acal-link:focus-visible {
    outline: 2px solid hsl(5, 53%, 32%);
  }

  .acal-terms {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    max-width: 52rem;
  }

  .acal-card {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: 0.625rem 0.75rem;
    border: 1px solid hsl(0, 0%, 88%);
    border-radius: 0.625rem;
    background: white;
  }

  .acal-card--current {
    border-color: hsl(5, 53%, 32%);
    background: hsl(5, 53%, 98%);
  }

  .acal-card__head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    flex-wrap: wrap;
  }

  .acal-card__label {
    margin: 0;
    font-size: 0.875rem;
    font-weight: 700;
    color: hsl(0, 0%, 16%);
  }

  .acal-badge {
    flex: 0 0 auto;
    font-size: 0.625rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    padding: 0.125rem 0.4375rem;
    border-radius: 999px;
  }

  .acal-badge--in-session {
    background: hsl(5, 53%, 32%);
    color: white;
  }

  .acal-badge--upcoming {
    background: hsl(5, 30%, 92%);
    color: hsl(5, 40%, 30%);
  }

  .acal-badge--past,
  .acal-badge--undated {
    background: hsl(0, 0%, 92%);
    color: hsl(0, 0%, 40%);
  }

  .acal-card__meta {
    margin: 0;
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem 0.75rem;
    font-size: 0.75rem;
    color: hsl(0, 0%, 42%);
  }

  @media (max-width: 48rem) {
    .acal-screen {
      padding: 0.75rem 0.75rem calc(0.75rem + env(safe-area-inset-bottom, 0px));
    }
  }

  /* 320px: keep every other month label so ticks don't collide. */
  @media (max-width: 30rem) {
    .acal-month:nth-child(even) {
      font-size: 0;
    }
  }
</style>
