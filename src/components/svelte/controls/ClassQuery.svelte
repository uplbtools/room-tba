<script lang="ts">
  import { onMount } from "svelte";
  import { queryStore, termStore } from "@lib/store.svelte";
  import {
    fetchFinalExams,
    FINALS_SCOPE_NOTE,
    looksLikeCourseCode,
  } from "@lib/final-exams";
  import { normalizeCourseCode } from "@lib/final-exams/normalize";
  import type { FinalExamRow } from "@lib/types";
  import FinalExamsList from "@ui/room/FinalExamsList.svelte";

  let finalExams = $state<FinalExamRow[]>([]);
  let loading = $state(false);

  onMount(() => {
    termStore.init();
  });

  const courseQuery = $derived(normalizeCourseCode(queryStore.queryValue));

  $effect(() => {
    const code = courseQuery;
    const termId = termStore.activeTermId;
    if (!code || termId == null || !looksLikeCourseCode(code)) {
      finalExams = [];
      loading = false;
      return;
    }

    loading = true;
    void fetchFinalExams({ courseCode: code, termId }).then((rows) => {
      finalExams = rows;
      loading = false;
    });
  });
</script>

<div class="class-query-container">
  <div class="header">
    <h2 class="title">Final exams for</h2>
    <span class="search-term">"{queryStore.queryValue}"</span>
  </div>

  {#if termStore.activeTerm?.label}
    <p class="term-label">{termStore.activeTerm.label}</p>
  {/if}

  <p class="scope-note">{FINALS_SCOPE_NOTE}</p>

  <div class="results-list">
    {#if loading}
      <p class="status">Loading final exams…</p>
    {:else if finalExams.length > 0}
      <FinalExamsList exams={finalExams} showRoom />
    {:else if courseQuery && looksLikeCourseCode(courseQuery)}
      <div class="no-results">
        <p>
          No final exam listed for {courseQuery}{termStore.activeTerm?.label
            ? ` in ${termStore.activeTerm.label}`
            : ""} yet. OUR may not have published finals for this term.
        </p>
      </div>
    {:else}
      <div class="no-results">
        <p>Enter a course code (e.g. CMSC 130) to look up final exams.</p>
      </div>
    {/if}
  </div>
</div>

<style>
  .class-query-container {
    display: flex;
    flex-direction: column;
    flex: 1 1 0;
    gap: 1rem;
    height: 100%;
    overflow: auto;
  }

  .header {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .title {
    font-size: 0.875rem;
    color: #666;
    margin: 0;
    font-weight: 500;
  }

  .search-term {
    font-size: 1.25rem;
    font-weight: 600;
    color: #7b1113;
  }

  .term-label {
    margin: 0;
    font-size: 0.75rem;
    font-weight: 600;
    color: hsl(5, 53%, 32%);
  }

  .scope-note {
    margin: 0;
    font-size: 0.75rem;
    line-height: 1.4;
    color: hsl(0, 0%, 45%);
  }

  .results-list {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    overflow-y: auto;
    padding-right: 0.25rem;
    flex: 1;
  }

  .status,
  .no-results p {
    margin: 0;
    font-size: 0.875rem;
    color: hsl(0, 0%, 45%);
  }
</style>
