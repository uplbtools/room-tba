<script lang="ts">
  import ChevronLeft from "@lucide/svelte/icons/chevron-left";
  import MapPin from "@lucide/svelte/icons/map-pin";
  import { fly } from "svelte/transition";
  import { MediaQuery } from "svelte/reactivity";
  import { trapFocus } from "@lib/focus-trap";
  import { fullScreenReveal } from "@lib/motion";
  import {
    plannerStore,
    queryStore,
    sidebarStore,
    termStore,
  } from "@lib/store.svelte";
  import { buildAgenda } from "@lib/today-agenda";
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

  function close() {
    sidebarStore.changeOpened("map");
  }

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
      <ChevronLeft size={18} aria-hidden="true" />
      <span>Back to map</span>
    </button>
    <h1 class="today-title" id="today-screen-title">Today</h1>
  </header>

  {#if offTermNote}
    <p class="today-note" role="note">{offTermNote}</p>
  {/if}

  <div class="today-body">
    {#if !hasPlan}
      <p class="today-empty-plan">
        Add classes to see your day.
        <button type="button" onclick={() => sidebarStore.changeOpened("planner")}>
          Open the Planner
        </button>
      </p>
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
    background: hsl(0, 0%, 98%);
    pointer-events: auto;
    overflow: hidden;
  }

  .today-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .today-back {
    all: unset;
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.5rem;
    border-radius: 0.5rem;
    font-size: 0.875rem;
    font-weight: 600;
    color: hsl(5, 53%, 32%);
    cursor: pointer;
  }

  .today-back:hover {
    background: hsl(5, 30%, 94%);
  }

  .today-back:focus-visible {
    outline: 2px solid hsl(5, 53%, 32%);
  }

  .today-title {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 800;
    color: hsl(0, 0%, 12%);
  }

  .today-note {
    margin: 0;
    max-width: 52rem;
    font-size: 0.8125rem;
    color: hsl(0, 0%, 40%);
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
    margin: 0;
    max-width: 52rem;
    font-size: 0.875rem;
    color: hsl(0, 0%, 35%);
  }

  .today-empty-plan button {
    all: unset;
    margin-left: 0.25rem;
    color: hsl(5, 53%, 32%);
    font-weight: 700;
    cursor: pointer;
    text-decoration: underline;
  }

  .today-empty-plan button:focus-visible {
    outline: 2px solid hsl(5, 53%, 32%);
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
    color: hsl(0, 0%, 20%);
  }

  .today-day--now .today-day__title {
    color: hsl(5, 53%, 32%);
  }

  .today-day__date {
    font-size: 0.8125rem;
    font-weight: 500;
    color: hsl(0, 0%, 45%);
  }

  .today-day__empty {
    margin: 0;
    padding: 0.5rem 0.75rem;
    border: 1px dashed hsl(0, 0%, 82%);
    border-radius: 0.625rem;
    font-size: 0.8125rem;
    color: hsl(0, 0%, 45%);
  }

  /* Weekends read as a different kind of day, not just an empty weekday. */
  .today-day--weekend .today-day__heading {
    color: hsl(0, 0%, 45%);
  }

  .today-day--weekend .today-day__empty {
    background: hsl(0, 0%, 95%);
    border-style: solid;
    border-color: hsl(0, 0%, 88%);
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
    border: 1px solid hsl(0, 0%, 90%);
    border-radius: 0.625rem;
    background: white;
  }

  .today-entry__time {
    font-size: 0.8125rem;
    font-weight: 700;
    color: hsl(0, 0%, 25%);
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
    color: hsl(0, 0%, 15%);
  }

  .today-entry__type,
  .today-entry__section {
    font-size: 0.75rem;
    font-weight: 600;
    color: hsl(0, 0%, 42%);
  }

  .today-entry__course-title {
    font-size: 0.75rem;
    color: hsl(0, 0%, 42%);
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
    border: 1px solid hsl(5, 53%, 82%);
    border-radius: 999px;
    color: hsl(5, 53%, 32%);
    font-size: 0.75rem;
    font-weight: 700;
    cursor: pointer;
  }

  .today-entry__room:hover,
  .today-entry__room:focus-visible {
    background: hsl(5, 53%, 96%);
  }

  .today-entry__room:focus-visible {
    outline: 2px solid hsl(5, 53%, 32%);
    outline-offset: 1px;
  }

  .today-entry__room--tba {
    border-color: hsl(0, 0%, 85%);
    color: hsl(0, 0%, 45%);
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
