<script lang="ts">
  import LoadingIndicator from "@ui/LoadingIndicator.svelte";
  import { currentRoom, roomClassesStore, termStore } from "@lib/store.svelte";
  import ScheduleRender from "@ui/room/ScheduleRender.svelte";
  import ScheduleFreshnessNote from "@ui/ScheduleFreshnessNote.svelte";

  const room = $derived(currentRoom.value);
  const classes = $derived(roomClassesStore.classes);
  const termLabel = $derived(termStore.activeTerm?.label ?? null);
</script>

<div class="schedule-modal">
  <div class="schedule-modal__header">
    <h2>{room ? `Schedule: ${room.code}` : "Schedule"}</h2>
    {#if termLabel}
      <span class="schedule-modal__term">{termLabel}</span>
    {/if}
    <ScheduleFreshnessNote importedAt={termStore.activeTerm?.classesImportedAt} />
  </div>
  <div class="schedule-modal__body map-chrome-scroll">
    {#if roomClassesStore.loading}
      <p class="schedule-modal__empty">
        <LoadingIndicator label="Loading classes…" />
      </p>
    {:else if room && classes.length > 0}
      <ScheduleRender roomCode={room.code} {classes} />
    {:else}
      <p class="schedule-modal__empty">
        No classes to display for this room{termLabel ? ` in ${termLabel}` : ""}.
      </p>
    {/if}
  </div>
</div>

<style>
  .schedule-modal {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.75rem;
    max-height: 100%;
    min-height: 0;
    background: var(--map-chrome-surface, hsl(5 20% 97%));
    border: 1px solid var(--map-chrome-border, hsl(5 10% 68%));
    border-radius: var(--map-chrome-radius, 1rem);
    box-shadow: var(--map-chrome-panel-shadow);
  }

  .schedule-modal__header {
    display: flex;
    align-items: baseline;
    gap: 0.625rem;
    flex-wrap: wrap;
    padding-bottom: 0.375rem;
    border-bottom: 1px solid var(--map-chrome-divider, hsl(5 12% 88%));
  }

  .schedule-modal__header h2 {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 700;
    color: hsl(5, 53%, 22%);
  }

  .schedule-modal__term {
    font-size: 0.8125rem;
    font-weight: 600;
    color: hsl(5, 53%, 32%);
  }

  .schedule-modal__body {
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
  }

  .schedule-modal__empty {
    margin: 0;
    padding: 1.5rem 0.5rem;
    color: hsl(0, 0%, 45%);
    font-size: 0.875rem;
  }
</style>
