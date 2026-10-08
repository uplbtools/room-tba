<script lang="ts">
  import LoadingIndicator from "@ui/LoadingIndicator.svelte";
  import { currentRoom, roomClassesStore, termStore } from "@lib/store.svelte";
  import ScheduleRender from "@ui/room/ScheduleRender.svelte";
  import ScheduleFreshnessNote from "@ui/ScheduleFreshnessNote.svelte";
  import ModalHeader from "./ModalHeader.svelte";

  const room = $derived(currentRoom.value);
  const classes = $derived(roomClassesStore.classes);
  const termLabel = $derived(termStore.activeTerm?.label ?? null);
</script>

<div class="schedule-modal">
  <ModalHeader
    title={room ? `Schedule: ${room.code}` : "Schedule"}
    description={termLabel ?? undefined}
  />
  <div class="schedule-modal__body map-chrome-scroll">
    <ScheduleFreshnessNote
      importedAt={termStore.activeTerm?.classesImportedAt}
      termId={termStore.activeTermId}
    />
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
    flex: 1 1 auto;
    min-height: 0;
  }

  .schedule-modal__body {
    flex: 1 1 auto;
    min-height: 0;
    padding: 0 1rem 0.75rem;
    overflow-y: auto;
    overscroll-behavior: contain;
    -webkit-overflow-scrolling: touch;
  }

  .schedule-modal__empty {
    margin: 0;
    padding: 1.5rem 0.5rem;
    color: var(--theme-text-2, hsl(0, 0%, 45%));
    font-size: 0.875rem;
  }
</style>
