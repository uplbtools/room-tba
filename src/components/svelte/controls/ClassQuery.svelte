<script lang="ts">
  import { onMount } from "svelte";
  import ChevronLeft from "@lucide/svelte/icons/chevron-left";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import Classes from "@ui/room/Classes.svelte";
  import FinalExamsList from "@ui/room/FinalExamsList.svelte";
  import { fetchClassPage } from "@lib/classes-api";
  import { ROOM_SCHEDULE_SCOPE_NOTE } from "@lib/amis/room-scheduled-types";
  import {
    fetchFinalExams,
    FINALS_SCOPE_NOTE,
    looksLikeCourseCode,
  } from "@lib/final-exams";
  import { normalizeCourseCode } from "@lib/final-exams/normalize";
  import { queryStore, sidePanelStore, termStore } from "@lib/store.svelte";
  import type { ClassMapValue, FinalExamRow } from "@lib/types";

  const PAGE_SIZE = 25;

  let classes = $state<ClassMapValue[]>([]);
  let classTotal = $state(0);
  let classPage = $state(1);
  let classesLoading = $state(false);
  let classesError = $state<string | null>(null);

  let finalExams = $state<FinalExamRow[]>([]);
  let finalsLoading = $state(false);

  onMount(() => {
    termStore.init();
  });

  const courseQuery = $derived(normalizeCourseCode(queryStore.queryValue));
  const classPageCount = $derived(
    Math.max(1, Math.ceil(classTotal / PAGE_SIZE)),
  );
  const currentClassPage = $derived(Math.min(classPage, classPageCount));
  const classRangeStart = $derived(
    classTotal === 0 ? 0 : (currentClassPage - 1) * PAGE_SIZE + 1,
  );
  const classRangeEnd = $derived(
    Math.min(currentClassPage * PAGE_SIZE, classTotal),
  );

  $effect(() => {
    courseQuery;
    classPage = 1;
  });

  $effect(() => {
    const termId = termStore.activeTermId;
    const prefix = courseQuery;
    const page = currentClassPage;

    if (!prefix) {
      classes = [];
      classTotal = 0;
      classesLoading = false;
      classesError = null;
      return;
    }

    classesLoading = true;
    classesError = null;
    void fetchClassPage({
      termId,
      courseCodePrefix: prefix,
      limit: PAGE_SIZE,
      offset: (page - 1) * PAGE_SIZE,
    })
      .then((result) => {
        classes = result.rows;
        classTotal = result.total;
      })
      .catch(() => {
        classes = [];
        classTotal = 0;
        classesError = "Could not load classes for this course.";
      })
      .finally(() => {
        classesLoading = false;
      });
  });

  $effect(() => {
    const code = courseQuery;
    const termId = termStore.activeTermId;
    if (!code || termId == null || !looksLikeCourseCode(code)) {
      finalExams = [];
      finalsLoading = false;
      return;
    }

    finalsLoading = true;
    void fetchFinalExams({ courseCode: code, termId }).then((rows) => {
      finalExams = rows;
      finalsLoading = false;
    });
  });

  function goToClassPage(next: number) {
    classPage = Math.min(Math.max(1, next), classPageCount);
  }

  function openBrowseAll() {
    queryStore.updateQuery({
      category: "classes",
      type: "result",
      value: "All classes",
    });
    sidePanelStore.expand();
  }
</script>

<div class="class-query-container">
  <div class="header">
    <h2 class="title">Classes for</h2>
    <span class="search-term">"{queryStore.queryValue}"</span>
  </div>

  {#if termStore.activeTerm?.label}
    <p class="term-label">{termStore.activeTerm.label}</p>
  {/if}

  <p class="scope-note">{ROOM_SCHEDULE_SCOPE_NOTE}</p>

  <div class="results-list">
    {#if !courseQuery}
      <div class="no-results">
        <p>
          Enter a course code (e.g. CMSC 130) to look up sections and rooms.
        </p>
        <button type="button" class="browse-all-btn" onclick={openBrowseAll}>
          Browse all classes →
        </button>
      </div>
    {:else if classesLoading}
      <p class="status">Loading classes…</p>
    {:else if classesError}
      <div class="no-results">
        <p class="status">{classesError}</p>
        <button
          type="button"
          class="browse-all-btn"
          onclick={() => {
            classPage = 1;
            classesError = null;
          }}
        >
          Retry →
        </button>
      </div>
    {:else if classes.length > 0}
      <Classes {classes} />
      {#if classTotal > PAGE_SIZE}
        <footer class="pagination">
          <button
            type="button"
            class="page-btn"
            disabled={currentClassPage <= 1}
            aria-label="Previous page"
            onclick={() => goToClassPage(currentClassPage - 1)}
          >
            <ChevronLeft size={16} aria-hidden="true" />
          </button>
          <span class="page-label">
            {classRangeStart}–{classRangeEnd} of {classTotal}
          </span>
          <button
            type="button"
            class="page-btn"
            disabled={currentClassPage >= classPageCount}
            aria-label="Next page"
            onclick={() => goToClassPage(currentClassPage + 1)}
          >
            <ChevronRight size={16} aria-hidden="true" />
          </button>
        </footer>
      {/if}
    {:else if looksLikeCourseCode(courseQuery)}
      <div class="no-results">
        <p>
          No LEC/LAB sections listed for {courseQuery}{termStore.activeTerm
            ?.label
            ? ` in ${termStore.activeTerm.label}`
            : ""}.
        </p>
        <button type="button" class="browse-all-btn" onclick={openBrowseAll}>
          Browse all classes →
        </button>
      </div>
    {/if}
  </div>

  {#if courseQuery && looksLikeCourseCode(courseQuery)}
    <section class="finals-section" aria-label="Final exams">
      <h3 class="finals-title">Final exams</h3>
      <p class="scope-note">{FINALS_SCOPE_NOTE}</p>
      {#if finalsLoading}
        <p class="status">Loading final exams…</p>
      {:else if finalExams.length > 0}
        <FinalExamsList exams={finalExams} showRoom />
      {:else}
        <p class="status">
          No final exam listed for {courseQuery} yet.
        </p>
      {/if}
    </section>
  {/if}
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

  .finals-section {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    padding-top: 0.5rem;
    border-top: 1px solid hsl(0, 0%, 90%);
  }

  .finals-title {
    margin: 0;
    font-size: 0.875rem;
    font-weight: 600;
    color: #333;
  }

  .status,
  .no-results p {
    margin: 0;
    font-size: 0.875rem;
    color: hsl(0, 0%, 45%);
  }

  .browse-all-btn {
    margin-top: 0.5rem;
    border: 0;
    background: none;
    padding: 0;
    color: hsl(5, 53%, 32%);
    font-size: 0.8125rem;
    font-weight: 600;
    cursor: pointer;
    text-align: left;
  }

  .pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
  }

  .page-btn {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2rem;
    border: 1px solid hsl(0, 0%, 86%);
    border-radius: 999px;
    background: white;
    cursor: pointer;
  }

  .page-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .page-label {
    font-size: 0.75rem;
    color: #666;
  }
</style>
