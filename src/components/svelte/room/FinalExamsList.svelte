<script lang="ts">
  import { queryStore, sidebarStore } from "@lib/store.svelte";
  import { formatExamDate, formatExamTimeRange } from "@lib/final-exams";
  import type { FinalExamRow } from "@lib/types";

  interface Props {
    exams: FinalExamRow[];
    showRoom?: boolean;
  }

  const { exams, showRoom = false }: Props = $props();

  function openRoom(roomCode: string | null | undefined) {
    if (!roomCode) return;
    queryStore.updateQuery({
      type: "result",
      category: "room",
      value: roomCode,
    });
    queryStore.inputValue = roomCode;
    // The room panel lives on the map view; leave any full screen (planner,
    // finals) that hosted this list.
    sidebarStore.changeOpened("map");
  }
</script>

<div class="final-exam-list">
  {#each exams as exam (exam.id)}
    <article class="final-exam-row">
      <div class="final-exam-row__main">
        <div class="final-exam-row__course">
          {exam.courseCode}
          {#if exam.section}
            <span class="final-exam-row__section">· {exam.section}</span>
          {/if}
        </div>
        {#if exam.courseTitle}
          <div class="final-exam-row__title">{exam.courseTitle}</div>
        {/if}
        <div class="final-exam-row__when">
          {formatExamDate(exam.examDate)} · {formatExamTimeRange(
            exam.startsAt,
            exam.endsAt,
          )}
        </div>
        {#if showRoom}
          {#if exam.roomCode}
            <button
              type="button"
              class="final-exam-row__room"
              onclick={() => openRoom(exam.roomCode)}
            >
              {exam.roomCode}
            </button>
          {:else}
            <div class="final-exam-row__room final-exam-row__room--tba">
              Room TBA
            </div>
          {/if}
        {/if}
      </div>
    </article>
  {/each}
</div>

<style>
  .final-exam-list {
    display: flex;
    flex-direction: column;
    gap: 0.625rem;
  }

  .final-exam-row {
    border: 1px solid hsl(0, 0%, 90%);
    border-radius: 0.5rem;
    padding: 0.625rem 0.75rem;
    background: hsl(0, 0%, 99%);
  }

  .final-exam-row__main {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    min-width: 0;
  }

  .final-exam-row__course {
    font-size: 0.875rem;
    font-weight: 700;
    color: hsl(0, 0%, 12%);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .final-exam-row__section {
    font-weight: 600;
    color: hsl(0, 0%, 35%);
  }

  .final-exam-row__title {
    font-size: 0.8125rem;
    color: hsl(0, 0%, 30%);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .final-exam-row__when {
    font-size: 0.8125rem;
    color: hsl(0, 0%, 35%);
  }

  .final-exam-row__room {
    all: unset;
    display: inline-block;
    margin-top: 0.125rem;
    font-size: 0.8125rem;
    font-weight: 700;
    color: hsl(5, 53%, 32%);
    cursor: pointer;
    text-decoration: underline;
    text-underline-offset: 0.125rem;
  }

  button.final-exam-row__room:hover {
    color: #7b1113;
  }

  .final-exam-row__room--tba {
    cursor: default;
    text-decoration: none;
    color: hsl(0, 0%, 45%);
    font-weight: 500;
  }
</style>
