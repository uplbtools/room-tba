<script lang="ts">
  import BookOpen from "@lucide/svelte/icons/book-open";
  import ChevronLeft from "@lucide/svelte/icons/chevron-left";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import X from "@lucide/svelte/icons/x";
  import Classes from "@ui/room/Classes.svelte";
  import { fetchClassPage } from "@lib/classes-api";
  import { ROOM_SCHEDULE_SCOPE_NOTE } from "@lib/amis/room-scheduled-types";
  import { queryStore, sidePanelStore, termStore } from "@lib/store.svelte";
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
  <header class="classes-list-header">
    <div class="classes-list-header-top">
      <div class="classes-list-kicker">
        <BookOpen size={16} aria-hidden="true" />
        <span>All classes</span>
      </div>
      <button
        class="classes-list-close"
        type="button"
        aria-label="Close class list"
        title="Close class list"
        onclick={closeList}
      >
        <X size={16} aria-hidden="true" />
        <span>Close</span>
      </button>
    </div>
    {#if termStore.activeTerm?.label}
      <p class="classes-list-term">{termStore.activeTerm.label}</p>
    {/if}
    <p class="classes-list-scope">{ROOM_SCHEDULE_SCOPE_NOTE}</p>
    <label class="classes-list-filter">
      <span class="sr-only">Filter by course code</span>
      <input
        type="search"
        value={filterText}
        placeholder="Filter by course code (e.g. CMSC)"
        oninput={onFilterInput}
      />
    </label>
  </header>

  <div class="classes-list-body">
    {#if loading}
      <p class="classes-list-status">Loading classes…</p>
    {:else if loadError}
      <p class="classes-list-status">{loadError}</p>
    {:else if classes.length === 0}
      <p class="classes-list-status">
        No classes listed{termStore.activeTerm?.label
          ? ` for ${termStore.activeTerm.label}`
          : ""}{coursePrefix ? ` matching “${coursePrefix}”` : ""}.
      </p>
    {:else}
      <Classes {classes} />
    {/if}
  </div>

  {#if !loading && !loadError && total > PAGE_SIZE}
    <footer class="classes-list-pagination">
      <button
        type="button"
        class="classes-list-page-btn"
        disabled={currentPage <= 1}
        aria-label="Previous page"
        onclick={() => goToPage(currentPage - 1)}
      >
        <ChevronLeft size={16} aria-hidden="true" />
      </button>
      <span class="classes-list-page-label">
        {rangeStart}–{rangeEnd} of {total}
      </span>
      <button
        type="button"
        class="classes-list-page-btn"
        disabled={currentPage >= pageCount}
        aria-label="Next page"
        onclick={() => goToPage(currentPage + 1)}
      >
        <ChevronRight size={16} aria-hidden="true" />
      </button>
    </footer>
  {/if}
</div>

<style>
  .classes-list-panel {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    height: 100%;
    min-height: 0;
  }

  .classes-list-header {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .classes-list-header-top {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.75rem;
  }

  .classes-list-kicker {
    display: inline-flex;
    align-items: center;
    gap: 0.375rem;
    font-size: 0.8125rem;
    font-weight: 600;
    color: hsl(5, 53%, 32%);
  }

  .classes-list-close {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    border: 1px solid hsl(0, 0%, 86%);
    border-radius: 999px;
    background: white;
    color: #444;
    font-size: 0.75rem;
    font-weight: 600;
    padding: 0.25rem 0.625rem;
    cursor: pointer;
  }

  .classes-list-term {
    margin: 0;
    font-size: 0.75rem;
    font-weight: 600;
    color: hsl(5, 53%, 32%);
  }

  .classes-list-scope {
    margin: 0;
    font-size: 0.75rem;
    line-height: 1.4;
    color: hsl(0, 0%, 45%);
  }

  .classes-list-filter input {
    width: 100%;
    box-sizing: border-box;
    border: 1px solid hsl(0, 0%, 86%);
    border-radius: 0.5rem;
    padding: 0.5rem 0.625rem;
    font-size: 0.875rem;
  }

  .classes-list-body {
    flex: 1;
    min-height: 0;
    overflow: auto;
  }

  .classes-list-status {
    margin: 0;
    font-size: 0.875rem;
    color: hsl(0, 0%, 45%);
  }

  .classes-list-pagination {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.75rem;
    padding-top: 0.25rem;
  }

  .classes-list-page-btn {
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

  .classes-list-page-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .classes-list-page-label {
    font-size: 0.75rem;
    color: #666;
  }
</style>
