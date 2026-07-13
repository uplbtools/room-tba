<script lang="ts">
  import ChevronLeft from "@lucide/svelte/icons/chevron-left";
  import Search from "@lucide/svelte/icons/search";
  import { fly } from "svelte/transition";
  import { MediaQuery } from "svelte/reactivity";
  import { trapFocus } from "@lib/focus-trap";
  import { fullScreenReveal } from "@lib/motion";
  import { sidebarStore, termStore } from "@lib/store.svelte";
  import {
    fetchFinalExams,
    FINALS_SCOPE_NOTE,
    formatExamDate,
  } from "@lib/final-exams";
  import { finalsWindowLabel } from "@lib/term-calendar";
  import FinalExamsList from "@ui/room/FinalExamsList.svelte";
  import TermSelector from "@ui/TermSelector.svelte";
  import type { FinalExamRow } from "@lib/types";

  const reducedMotion = new MediaQuery("(prefers-reduced-motion: reduce)");

  let screenEl = $state<HTMLDivElement | null>(null);
  let exams = $state<FinalExamRow[]>([]);
  let loading = $state(false);
  let filter = $state("");
  let requestKey = $state<string | null>(null);

  function close() {
    sidebarStore.changeOpened("map");
  }

  $effect(() => {
    if (!screenEl) return;
    return trapFocus(screenEl, { onEscape: close });
  });

  // One fetch per term (~1k rows); filtering happens client-side so typing is
  // instant and matches course code, title, section, and room together.
  $effect(() => {
    const termId = termStore.activeTermId;
    if (termId == null) {
      exams = [];
      return;
    }
    const key = String(termId);
    requestKey = key;
    loading = true;
    void fetchFinalExams({ termId }).then((rows) => {
      if (requestKey !== key) return;
      exams = rows;
      loading = false;
    });
  });

  const finalsWindow = $derived(finalsWindowLabel(termStore.activeTermId));

  const filtered = $derived.by(() => {
    const needle = filter.trim().toUpperCase();
    if (!needle) return exams;
    return exams.filter((exam) =>
      [exam.courseCode, exam.courseTitle, exam.section, exam.roomCode]
        .filter((part): part is string => Boolean(part))
        .some((part) => part.toUpperCase().includes(needle)),
    );
  });

  const byDate = $derived.by(() => {
    const groups = new Map<string, FinalExamRow[]>();
    for (const exam of filtered) {
      const group = groups.get(exam.examDate);
      if (group) group.push(exam);
      else groups.set(exam.examDate, [exam]);
    }
    return [...groups.entries()];
  });
</script>

<div
  bind:this={screenEl}
  class="finals-screen"
  role="dialog"
  aria-modal="true"
  aria-labelledby="finals-screen-title"
  in:fly={fullScreenReveal(reducedMotion.current)}
>
  <header class="finals-header">
    <button
      type="button"
      class="finals-back"
      onclick={close}
      aria-label="Back to map"
      title="Back to map"
    >
      <ChevronLeft size={18} aria-hidden="true" />
      <span>Back to map</span>
    </button>
    <h1 class="finals-title" id="finals-screen-title">Final Exams</h1>
    {#if termStore.terms.length > 0}
      <TermSelector variant="chip" />
    {/if}
  </header>

  <p class="finals-note" role="note">{FINALS_SCOPE_NOTE}</p>

  <label class="finals-search">
    <Search size={16} aria-hidden="true" />
    <input
      type="search"
      placeholder="Filter by course, section, or room…"
      bind:value={filter}
      aria-label="Filter final exams"
    />
  </label>

  <div class="finals-body">
    {#if loading}
      <p class="finals-status" role="status">Loading final exams…</p>
    {:else if exams.length === 0}
      <p class="finals-status">
        No final exam schedule published for this term yet.{#if finalsWindow}
          The academic calendar sets final exams for {finalsWindow}.{/if}
      </p>
    {:else if filtered.length === 0}
      <p class="finals-status">No exams match “{filter}”.</p>
    {:else}
      {#each byDate as [date, dayExams] (date)}
        <section class="finals-day" aria-label={formatExamDate(date)}>
          <h2 class="finals-day__heading">
            {formatExamDate(date)}
            <span class="finals-day__count">({dayExams.length})</span>
          </h2>
          <FinalExamsList exams={dayExams} showRoom={true} />
        </section>
      {/each}
    {/if}
  </div>
</div>

<style>
  .finals-screen {
    position: absolute;
    inset: 0;
    z-index: 150;
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    padding: 1rem 1.25rem calc(1rem + env(safe-area-inset-bottom, 0px));
    background: hsl(0, 0%, 98%);
    pointer-events: auto;
    overflow: hidden;
  }

  .finals-header {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    flex-wrap: wrap;
  }

  .finals-back {
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

  .finals-back:hover {
    background: hsl(5, 30%, 94%);
  }

  .finals-back:focus-visible {
    outline: 2px solid hsl(5, 53%, 32%);
  }

  .finals-title {
    margin: 0;
    font-size: 1.25rem;
    font-weight: 800;
    color: hsl(0, 0%, 12%);
  }

  .finals-note {
    margin: 0;
    font-size: 0.8125rem;
    color: hsl(0, 0%, 40%);
    max-width: 52rem;
  }

  .finals-search {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    max-width: 26rem;
    padding: 0.5rem 0.75rem;
    border: 1px solid hsl(0, 0%, 85%);
    border-radius: 0.625rem;
    background: white;
    color: hsl(0, 0%, 45%);
  }

  .finals-search:focus-within {
    border-color: hsl(5, 53%, 32%);
  }

  .finals-search input {
    all: unset;
    flex: 1;
    font-size: 0.875rem;
    color: hsl(0, 0%, 12%);
  }

  .finals-body {
    flex: 1;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    padding-bottom: 1rem;
  }

  .finals-status {
    margin: 0;
    font-size: 0.875rem;
    color: hsl(0, 0%, 40%);
  }

  .finals-day {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    max-width: 52rem;
  }

  .finals-day__heading {
    margin: 0;
    font-size: 0.9375rem;
    font-weight: 700;
    color: hsl(0, 0%, 20%);
    position: sticky;
    top: 0;
    background: hsl(0, 0%, 98%);
    padding: 0.25rem 0;
  }

  .finals-day__count {
    font-weight: 500;
    color: hsl(0, 0%, 45%);
  }

  @media (max-width: 48rem) {
    .finals-screen {
      padding: 0.75rem 0.75rem calc(0.75rem + env(safe-area-inset-bottom, 0px));
    }
  }
</style>
