<script lang="ts">
  import LoadingIndicator from "@ui/LoadingIndicator.svelte";
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
  let total = $state(0);
  let page = $state(1);
  let loading = $state(false);
  let loadError = $state<string | null>(null);
  let filterText = $state("");

  onMount(() => {
    termStore.init();
  });

  const pageCount = $derived(Math.max(1, Math.ceil(total / PAGE_SIZE)));
  const currentPage = $derived(Math.min(page, pageCount));
  const rangeStart = $derived(
    total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1,
  );
  const rangeEnd = $derived(Math.min(currentPage * PAGE_SIZE, total));
  const coursePrefix = $derived(filterText.trim());

  $effect(() => {
    const termId = termStore.activeTermId;
    const prefix = coursePrefix;
    const activePage = currentPage;

    loading = true;
    loadError = null;
    void fetchClassPage({
      termId,
      courseCodePrefix: prefix || undefined,
      limit: PAGE_SIZE,
      offset: (activePage - 1) * PAGE_SIZE,
    })
      .then((result) => {
        classes = result.rows;
        total = result.total;
      })
      .catch(() => {
        classes = [];
        total = 0;
        loadError =
          "Could not load classes. Check your connection and try again.";
      })
      .finally(() => {
        loading = false;
      });
  });

  function goToPage(next: number) {
    page = Math.min(Math.max(1, next), pageCount);
  }

  function onFilterInput(event: Event) {
    filterText = (event.currentTarget as HTMLInputElement).value;
    page = 1;
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
    <ScheduleFreshnessNote importedAt={termStore.activeTerm?.classesImportedAt} />
    {/snippet}
  </EntityPanelHeader>

  <div class="entity-panel-body">
    {#if loading}
      <p class="entity-panel-note"><LoadingIndicator label="Loading classes…" /></p>
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

  {#if !loading && !loadError && total > PAGE_SIZE}
    <EntityPagination
      {rangeStart}
      {rangeEnd}
      {total}
      prevDisabled={currentPage <= 1}
      nextDisabled={currentPage >= pageCount}
      onPrevious={() => goToPage(currentPage - 1)}
      onNext={() => goToPage(currentPage + 1)}
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
