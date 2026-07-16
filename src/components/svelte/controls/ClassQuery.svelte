<script lang="ts">
  import LoadingIndicator from "@ui/LoadingIndicator.svelte";
  import { onMount } from "svelte";
  import EntityPagination from "./EntityPagination.svelte";
  import Classes from "@ui/room/Classes.svelte";
  import FinalExamsList from "@ui/room/FinalExamsList.svelte";
  import { fetchClassPage } from "@lib/classes-api";
  import { CLASS_BROWSE_SCOPE_NOTE } from "@lib/amis/room-scheduled-types";
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

<div class="entity-detail class-query-container">
  <header class="entity-header">
    <div class="entity-header__title-row">
      <h2 class="entity-header__title">
        {courseQuery || queryStore.queryValue}
      </h2>
      {#if termStore.activeTerm?.label}
        <span class="entity-header__badge">{termStore.activeTerm.label}</span>
      {/if}
    </div>
    <p class="entity-panel-note">{CLASS_BROWSE_SCOPE_NOTE}</p>
  </header>

  <div class="results-list">
    {#if !courseQuery}
      <div class="no-results">
        <p>
          Enter a course code (e.g. CMSC 130) to look up sections and rooms.
        </p>
        <button
          type="button"
          class="entity-footer__link"
          onclick={openBrowseAll}
        >
          Browse all classes →
        </button>
      </div>
    {:else if classesLoading}
      <p class="status"><LoadingIndicator label="Loading classes…" /></p>
    {:else if classesError}
      <div class="no-results">
        <p class="status">{classesError}</p>
        <button
          type="button"
          class="entity-footer__link"
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
        <EntityPagination
          rangeStart={classRangeStart}
          rangeEnd={classRangeEnd}
          total={classTotal}
          prevDisabled={currentClassPage <= 1}
          nextDisabled={currentClassPage >= classPageCount}
          onPrevious={() => goToClassPage(currentClassPage - 1)}
          onNext={() => goToClassPage(currentClassPage + 1)}
        />
      {/if}
    {:else if looksLikeCourseCode(courseQuery)}
      <div class="no-results">
        <p>
          No sections listed for {courseQuery}{termStore.activeTerm?.label
            ? ` in ${termStore.activeTerm.label}`
            : ""}.
        </p>
        <button
          type="button"
          class="entity-footer__link"
          onclick={openBrowseAll}
        >
          Browse all classes →
        </button>
      </div>
    {/if}
  </div>

  {#if courseQuery && looksLikeCourseCode(courseQuery)}
    <section
      class="entity-list-section finals-section"
      aria-label="Final exams"
    >
      <h3 class="entity-section-heading">Final exams</h3>
      <p class="entity-panel-note">{FINALS_SCOPE_NOTE}</p>
      {#if finalsLoading}
        <p class="status"><LoadingIndicator label="Loading final exams…" /></p>
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
  @import "./entity-detail.css";

  .class-query-container {
    flex: 1 1 0;
    height: 100%;
    overflow: auto;
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
    gap: 0.375rem;
  }

  .status,
  .no-results p {
    margin: 0;
    font-size: 0.8125rem;
    color: #71717a;
  }

  .no-results {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }
</style>
