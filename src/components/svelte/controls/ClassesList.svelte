<script lang="ts">
  import EntitySkeleton from "@ui/EntitySkeleton.svelte";
  import Classes from "@ui/room/Classes.svelte";
  import EntityEmptyState from "./EntityEmptyState.svelte";
  import EntityPanelFilter from "./EntityPanelFilter.svelte";
  import EntityPanelHeader from "./EntityPanelHeader.svelte";
  import EntityPagination from "./EntityPagination.svelte";
  import { fetchClassPage } from "@lib/classes-api";
  import { CLASS_BROWSE_SCOPE_NOTE } from "@lib/amis/room-scheduled-types";
  import { queryStore, termStore } from "@lib/store.svelte";
  import ScheduleFreshnessNote from "@ui/ScheduleFreshnessNote.svelte";
  import type { ClassMapValue } from "@lib/types";
  import { onMount } from "svelte";
    import TermSelector from "@ui/TermSelector.svelte";

  const PAGE_SIZE = 25;

  let classes = $state<ClassMapValue[]>([]);
  // Cursor pagination (#412): pageCursor fetched the current page (null = first
  // page); prevCursors stacks the cursors behind it so Previous can walk back.
  let pageCursor = $state<string | null>(null);
  let prevCursors = $state<(string | null)[]>([]);
  let nextCursor = $state<string | null>(null);
  let hasMore = $state(false);
  let loading = $state(false);
  let loadError = $state<string | null>(null);
  let filterText = $state("");

  onMount(() => {
    termStore.init();
  });

  // Every page behind the current one was full (Next only shows on hasMore).
  const rangeStart = $derived(
    classes.length === 0 ? 0 : prevCursors.length * PAGE_SIZE + 1,
  );
  const rangeEnd = $derived(prevCursors.length * PAGE_SIZE + classes.length);
  const coursePrefix = $derived(filterText.trim());

  // A new term or filter invalidates keyset positions: back to the first page.
  $effect(() => {
    termStore.activeTermId;
    coursePrefix;
    prevCursors = [];
    pageCursor = null;
  });

  $effect(() => {
    const termId = termStore.activeTermId;
    const prefix = coursePrefix;
    const cursor = pageCursor;

    loading = true;
    loadError = null;
    void fetchClassPage({
      termId,
      courseCodePrefix: prefix || undefined,
      limit: PAGE_SIZE,
      cursor,
    })
      .then((result) => {
        classes = result.rows;
        nextCursor = result.nextCursor;
        hasMore = result.hasMore;
      })
      .catch(() => {
        classes = [];
        nextCursor = null;
        hasMore = false;
        loadError =
          "Could not load classes. Check your connection and try again.";
      })
      .finally(() => {
        loading = false;
      });
  });

  function goNext() {
    if (!nextCursor) return;
    prevCursors = [...prevCursors, pageCursor];
    pageCursor = nextCursor;
  }

  function goPrevious() {
    if (prevCursors.length === 0) return;
    const stack = prevCursors.slice();
    pageCursor = stack.pop() ?? null;
    prevCursors = stack;
  }

  function onFilterInput(event: Event) {
    filterText = (event.currentTarget as HTMLInputElement).value;
  }

  function closeList() {
    queryStore.clearQuery();
  }
</script>

<div class="classes-list-panel">
  <EntityPanelHeader
    closeAriaLabel="Close class list"
    closeTitle="Close class list"
    onclose={closeList}
  >
    {#snippet trailing()}
      <div class="entity-header__title-row">
        <h2 class="entity-header__title">All classes</h2>
      </div>
      <p class="entity-panel-note">{CLASS_BROWSE_SCOPE_NOTE}</p>
      <EntityPanelFilter
        value={filterText}
        label="Filter by course code"
        placeholder="Filter by course code (e.g. CMSC)"
        oninput={onFilterInput}
      />
    <TermSelector />
    <ScheduleFreshnessNote
      importedAt={termStore.activeTerm?.classesImportedAt}
      termId={termStore.activeTermId}
    />
    {/snippet}
  </EntityPanelHeader>

  <div class="entity-panel-body">
    {#if loading}
      <EntitySkeleton variant="classes" label="Loading classes…" />
    {:else if loadError}
      <p class="entity-panel-note">{loadError}</p>
    {:else if classes.length === 0}
      <EntityEmptyState
        title="No classes on the board"
        description={coursePrefix
          ? `Nothing matches “${coursePrefix}”${
              termStore.activeTerm?.label
                ? ` in ${termStore.activeTerm.label}`
                : ""
            }. Try a shorter code or another term.`
          : `No classes listed${
              termStore.activeTerm?.label
                ? ` for ${termStore.activeTerm.label}`
                : ""
            } yet. Switch terms or check back after the next import.`}
      >
        {#snippet icon()}
          <svg viewBox="0 0 180 128" fill="none" aria-hidden="true">
            <!-- Open schedule booklet. -->
            <rect
              x="34"
              y="28"
              width="112"
              height="76"
              rx="10"
              fill="currentColor"
              opacity=".1"
            />
            <path
              d="M90 30v72"
              stroke="currentColor"
              stroke-width="3"
              opacity=".35"
            />
            <rect
              x="34"
              y="28"
              width="112"
              height="76"
              rx="10"
              stroke="currentColor"
              stroke-width="3"
            />
            <path
              d="M50 48h28M50 64h28M50 80h20M102 48h28M102 64h28M102 80h20"
              stroke="currentColor"
              stroke-width="3"
              stroke-linecap="round"
              opacity=".55"
            />
          </svg>
        {/snippet}
      </EntityEmptyState>
    {:else}
      <Classes {classes} />
    {/if}
  </div>

  {#if !loading && !loadError && (hasMore || prevCursors.length > 0)}
    <EntityPagination
      {rangeStart}
      {rangeEnd}
      prevDisabled={prevCursors.length === 0}
      nextDisabled={!nextCursor}
      onPrevious={goPrevious}
      onNext={goNext}
    />
  {/if}
</div>

<style>
  @import "./entity-detail.css";

  .classes-list-panel {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    height: 100%;
    min-height: 0;
  }
</style>
