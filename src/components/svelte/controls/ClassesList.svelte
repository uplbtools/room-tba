<script lang="ts">
  import BookOpen from "@lucide/svelte/icons/book-open";
  import Classes from "@ui/room/Classes.svelte";
  import EntityPanelFilter from "./EntityPanelFilter.svelte";
  import EntityPanelHeader from "./EntityPanelHeader.svelte";
  import EntityPagination from "./EntityPagination.svelte";
  import { fetchClassPage } from "@lib/classes-api";
  import { ROOM_SCHEDULE_SCOPE_NOTE } from "@lib/amis/room-scheduled-types";
  import { queryStore, termStore } from "@lib/store.svelte";
  import type { ClassMapValue } from "@lib/types";
  import { onMount } from "svelte";

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
    {#snippet kicker()}
      <BookOpen size={16} aria-hidden="true" />
      <span>All classes</span>
    {/snippet}
    {#snippet trailing()}
      {#if termStore.activeTerm?.label}
        <p class="entity-panel-term">{termStore.activeTerm.label}</p>
      {/if}
      <p class="entity-panel-note">{ROOM_SCHEDULE_SCOPE_NOTE}</p>
      <EntityPanelFilter
        value={filterText}
        label="Filter by course code"
        placeholder="Filter by course code (e.g. CMSC)"
        oninput={onFilterInput}
      />
    {/snippet}
  </EntityPanelHeader>

  <div class="entity-panel-body">
    {#if loading}
      <p class="entity-panel-note">Loading classes…</p>
    {:else if loadError}
      <p class="entity-panel-note">{loadError}</p>
    {:else if classes.length === 0}
      <p class="entity-panel-note">
        No classes listed{termStore.activeTerm?.label
          ? ` for ${termStore.activeTerm.label}`
          : ""}{coursePrefix ? ` matching “${coursePrefix}”` : ""}.
      </p>
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
