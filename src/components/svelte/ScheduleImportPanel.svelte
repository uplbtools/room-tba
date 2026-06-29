<script lang="ts">
  import { scheduleRouteStore, type Weekday } from "@lib/store.svelte";
  import { onMount } from "svelte";
  import { formatMinutes } from "@lib/schedule-import/day-stops";
  import { WEEKDAY_LABELS, WEEKDAYS } from "@lib/schedule-import/types";

  type Props = {
    embedded?: boolean;
  };

  let { embedded = false }: Props = $props();

  let pasteText = $state("");

  const pastePlaceholder =
    '[{"course_code":"CMSC 123","section":"A","type":"LEC","schedule":["MW 08:00AM-09:00AM"]}]';

  onMount(() => {
    scheduleRouteStore.init();
  });

  async function handleImport() {
    const ok = await scheduleRouteStore.importText(pasteText);
    if (ok) pasteText = "";
  }

  function selectWeekday(day: Weekday) {
    scheduleRouteStore.selectWeekday(day);
  }

  function routeDay() {
    scheduleRouteStore.routeDay();
  }

  function clearImport() {
    scheduleRouteStore.clearImport();
    pasteText = "";
  }
</script>

<div
  class="schedule-import-panel"
  class:schedule-import-panel--embedded={embedded}
>
  <p class="schedule-import-panel__note">
    Personal import stays in this browser tab only (session storage). Room TBA
    matches your rows against institutional lecture and lab data for the active
    term — not your enlistment account.
  </p>
  <p class="schedule-import-panel__scope">{scheduleRouteStore.scopeNote}</p>

  <label class="schedule-import-panel__label" for="schedule-import-paste">
    Paste JSON or CSV export
  </label>
  <textarea
    id="schedule-import-paste"
    class="schedule-import-panel__textarea"
    bind:value={pasteText}
    rows="4"
    placeholder={pastePlaceholder}></textarea>

  {#if scheduleRouteStore.importError}
    <p class="schedule-import-panel__error" role="alert">
      {scheduleRouteStore.importError}
    </p>
  {/if}

  <div class="schedule-import-panel__actions">
    <button
      type="button"
      class="schedule-import-panel__primary"
      disabled={!pasteText.trim() || scheduleRouteStore.matching}
      onclick={handleImport}
    >
      {scheduleRouteStore.matching ? "Matching…" : "Import schedule"}
    </button>
    {#if scheduleRouteStore.hasImport}
      <button
        type="button"
        class="schedule-import-panel__secondary"
        onclick={clearImport}
      >
        Clear
      </button>
    {/if}
  </div>

  {#if scheduleRouteStore.hasImport}
    <div
      class="schedule-import-panel__weekdays"
      role="group"
      aria-label="Weekday"
    >
      {#each WEEKDAYS as day (day)}
        <button
          type="button"
          class="schedule-import-panel__weekday"
          class:schedule-import-panel__weekday--active={scheduleRouteStore.selectedWeekday ===
            day}
          aria-pressed={scheduleRouteStore.selectedWeekday === day}
          onclick={() => selectWeekday(day)}
        >
          {WEEKDAY_LABELS[day]}
        </button>
      {/each}
    </div>

    {#if scheduleRouteStore.matching}
      <p class="schedule-import-panel__status">Matching classes…</p>
    {:else}
      <ul
        class="schedule-import-panel__stops"
        aria-label="Class stops for selected day"
      >
        {#each scheduleRouteStore.dayStops as stop, index (stop.courseCode + stop.type + stop.scheduleSlot)}
          <li class="schedule-import-panel__stop">
            <span class="schedule-import-panel__stop-time">
              {formatMinutes(stop.startMinutes)}–{formatMinutes(
                stop.endMinutes,
              )}
            </span>
            <span class="schedule-import-panel__stop-title">
              {stop.courseCode}
              {stop.section} ({stop.type})
            </span>
            <span class="schedule-import-panel__stop-room">{stop.roomCode}</span
            >
            {#if stop.gapMinutesAfter !== null && index < scheduleRouteStore.dayStops.length - 1}
              <span class="schedule-import-panel__gap">
                {stop.gapMinutesAfter} min until next
              </span>
            {/if}
          </li>
        {:else}
          <li class="schedule-import-panel__empty">
            No routable classes this day.
          </li>
        {/each}
      </ul>

      {#if scheduleRouteStore.unresolved.length > 0}
        <details class="schedule-import-panel__unresolved">
          <summary>
            Unresolved ({scheduleRouteStore.unresolved.length})
          </summary>
          <ul>
            {#each scheduleRouteStore.unresolved as item (item.row.courseCode + item.row.section + item.row.type)}
              <li>
                {item.row.courseCode}
                {item.row.section} ({item.row.type}) —
                {item.unresolvedReason}
              </li>
            {/each}
          </ul>
        </details>
      {/if}

      <button
        type="button"
        class="schedule-import-panel__primary schedule-import-panel__route"
        disabled={scheduleRouteStore.dayStops.length === 0}
        onclick={routeDay}
      >
        Route this day
      </button>
    {/if}
  {/if}
</div>

<style>
  .schedule-import-panel {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    min-width: 0;
    width: 100%;
    box-sizing: border-box;
  }

  .schedule-import-panel__note,
  .schedule-import-panel__scope {
    margin: 0;
    font-size: 0.75rem;
    line-height: 1.35;
    color: hsl(0, 0%, 35%);
  }

  .schedule-import-panel__label {
    font-size: 0.8125rem;
    font-weight: 600;
    color: hsl(5, 53%, 22%);
  }

  .schedule-import-panel__textarea {
    box-sizing: border-box;
    width: 100%;
    min-height: 5.5rem;
    padding: 0.5rem 0.625rem;
    border: 1px solid var(--map-chrome-border, hsl(0, 0%, 58%));
    border-radius: 0.5rem;
    font: inherit;
    font-size: 0.8125rem;
    resize: vertical;
  }

  .schedule-import-panel__error {
    margin: 0;
    font-size: 0.8125rem;
    color: hsl(0, 65%, 40%);
  }

  .schedule-import-panel__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.375rem;
  }

  .schedule-import-panel__primary,
  .schedule-import-panel__secondary {
    box-sizing: border-box;
    border-radius: 0.625rem;
    padding: 0.4375rem 0.75rem;
    font: inherit;
    font-size: 0.8125rem;
    cursor: pointer;
    max-width: 100%;
  }

  .schedule-import-panel__primary {
    border: 1px solid hsl(5, 53%, 32%);
    background: hsl(5, 53%, 32%);
    color: #fff;
  }

  .schedule-import-panel__primary:disabled {
    opacity: 0.55;
    cursor: not-allowed;
  }

  .schedule-import-panel__secondary {
    border: 1px solid var(--map-chrome-border, hsl(0, 0%, 58%));
    background: var(--map-chrome-surface, #fff);
    color: hsl(5, 53%, 22%);
  }

  .schedule-import-panel__weekdays {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
  }

  .schedule-import-panel__weekday {
    flex: 1 1 auto;
    min-width: 2.5rem;
    padding: 0.3125rem 0.375rem;
    border-radius: 999px;
    border: 1px solid var(--map-chrome-border, hsl(0, 0%, 58%));
    background: hsl(0, 0%, 98%);
    font: inherit;
    font-size: 0.75rem;
    cursor: pointer;
  }

  .schedule-import-panel__weekday--active {
    border-color: hsl(5, 53%, 32%);
    background: hsl(5, 53%, 96%);
    color: hsl(5, 53%, 22%);
  }

  .schedule-import-panel__stops {
    margin: 0;
    padding: 0;
    list-style: none;
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .schedule-import-panel__stop {
    display: grid;
    gap: 0.125rem;
    padding: 0.4375rem 0.5rem;
    border-radius: 0.5rem;
    background: hsl(0, 0%, 98%);
    font-size: 0.8125rem;
    min-width: 0;
  }

  .schedule-import-panel__stop-time {
    font-weight: 600;
    color: hsl(5, 53%, 22%);
  }

  .schedule-import-panel__stop-title,
  .schedule-import-panel__stop-room {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .schedule-import-panel__gap {
    font-size: 0.75rem;
    color: hsl(0, 0%, 40%);
  }

  .schedule-import-panel__empty,
  .schedule-import-panel__status {
    margin: 0;
    font-size: 0.8125rem;
    color: hsl(0, 0%, 40%);
  }

  .schedule-import-panel__unresolved {
    font-size: 0.75rem;
    color: hsl(0, 0%, 35%);
  }

  .schedule-import-panel__unresolved ul {
    margin: 0.375rem 0 0;
    padding-left: 1rem;
  }

  .schedule-import-panel__route {
    width: 100%;
  }
</style>
