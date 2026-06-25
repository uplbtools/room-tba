<script lang="ts">
  import {
    currentRoom,
    roomClassesStore,
    termStore,
  } from "../../../lib/store.svelte";
  import ScheduleRender from "../room/ScheduleRender.svelte";

  const room = $derived(currentRoom.value);
  const classes = $derived(roomClassesStore.classes);
  const termLabel = $derived(termStore.activeTerm?.label ?? null);
</script>

<div class="schedule-modal">
  <div class="schedule-modal__header">
    <h2>{room ? `Schedule — ${room.code}` : "Schedule"}</h2>
    {#if termLabel}
      <span class="schedule-modal__term">{termLabel}</span>
    {/if}
  </div>
  {#if room && classes.length > 0}
    <ScheduleRender roomCode={room.code} {classes} />
  {:else}
    <p class="schedule-modal__empty">
      No classes to display for this room{termLabel ? ` in ${termLabel}` : ""}.
    </p>
  {/if}
</div>

<style>
  .schedule-modal {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding: 0.5rem;
  }

  .schedule-modal__header {
    display: flex;
    align-items: baseline;
    gap: 0.625rem;
    flex-wrap: wrap;
  }

  .schedule-modal__header h2 {
    margin: 0;
    font-size: 1.125rem;
    font-weight: 700;
    color: black;
  }

  .schedule-modal__term {
    font-size: 0.8125rem;
    font-weight: 600;
    color: hsl(5, 53%, 32%);
  }

  .schedule-modal__empty {
    margin: 0;
    padding: 1.5rem 0.5rem;
    color: hsl(0, 0%, 45%);
    font-size: 0.875rem;
  }
</style>
