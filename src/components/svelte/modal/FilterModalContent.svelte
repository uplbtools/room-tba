<script lang="ts">
  import X from "@lucide/svelte/icons/x";
  import { getAppData } from "@lib/context";
  import { modalStore, queryStore } from "@lib/store.svelte";
  import type { QueryStoreState } from "@lib/store.svelte";

  type BrowseTab = "buildings" | "colleges" | "divisions";

  const appData = getAppData();
  const { buildings, colleges, divisions } = $derived(appData());
  let activeTab = $state<BrowseTab>("buildings");

  const tabs: { id: BrowseTab; label: string }[] = [
    { id: "buildings", label: "Buildings" },
    { id: "colleges", label: "Colleges" },
    { id: "divisions", label: "Divisions" },
  ];

  function filterButtonClick(
    filter_type: Exclude<QueryStoreState["category"], "room" | null>,
    filter_name: string,
  ) {
    return () => {
      queryStore.updateQuery(
        { type: "result", category: filter_type },
        filter_name,
      );
      modalStore.closeModal();
    };
  }

  function formatBuildingLabel(name: string) {
    return name.replace(" Building", "");
  }

  function formatCollegeLabel(name: string) {
    return name.replace("College of ", "");
  }

  function formatDivisionLabel(name: string) {
    return name.replace(/(Department of |Institute of)/, "");
  }
</script>

<div class="filter-modal">
  <header class="filter-modal__header">
    <h2 class="filter-modal__title" id="filter-modal-title">Browse campus</h2>
    <button
      type="button"
      class="filter-modal__close"
      aria-label="Close browse dialog"
      onclick={() => modalStore.closeModal()}
    >
      <X size={20} aria-hidden="true" />
    </button>
  </header>

  <div class="filter-modal__tabs" role="tablist" aria-label="Browse by type">
    {#each tabs as tab (tab.id)}
      <button
        type="button"
        role="tab"
        id="filter-tab-{tab.id}"
        class="filter-modal__tab"
        class:filter-modal__tab--active={activeTab === tab.id}
        aria-selected={activeTab === tab.id}
        aria-controls="filter-panel-{tab.id}"
        onclick={() => (activeTab = tab.id)}
      >
        {tab.label}
      </button>
    {/each}
  </div>

  <div
    class="filter-modal__scroll"
    role="tabpanel"
    id="filter-panel-{activeTab}"
    aria-labelledby="filter-tab-{activeTab}"
  >
    <div class="filter-modal__grid">
      {#if activeTab === "buildings"}
        {#each buildings as { building_name } (building_name)}
          <button
            type="button"
            class="filter-modal__chip"
            onclick={filterButtonClick("building", building_name)}
          >
            <span class="filter-modal__chip-label"
              >{formatBuildingLabel(building_name)}</span
            >
          </button>
        {/each}
      {:else if activeTab === "colleges"}
        {#each colleges as { college_name } (college_name)}
          <button
            type="button"
            class="filter-modal__chip"
            onclick={filterButtonClick("college", college_name)}
          >
            <span class="filter-modal__chip-label"
              >{formatCollegeLabel(college_name)}</span
            >
          </button>
        {/each}
      {:else}
        {#each divisions as { division_name } (division_name)}
          <button
            type="button"
            class="filter-modal__chip"
            onclick={filterButtonClick("division", division_name)}
          >
            <span class="filter-modal__chip-label"
              >{formatDivisionLabel(division_name)}</span
            >
          </button>
        {/each}
      {/if}
    </div>
  </div>
</div>

<style>
  .filter-modal {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    min-height: 0;
    max-height: min(78dvh, 36rem);
    width: min(100%, 40rem);
    padding: 0.75rem 0.875rem 0.875rem;
    box-sizing: border-box;
  }

  .filter-modal__header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.5rem;
    flex-shrink: 0;
  }

  .filter-modal__title {
    margin: 0;
    font-size: 1rem;
    font-weight: 700;
    line-height: 1.25;
    color: hsl(5, 53%, 22%);
  }

  .filter-modal__close {
    all: unset;
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.75rem;
    height: 2.75rem;
    flex-shrink: 0;
    border-radius: 0.5rem;
    color: hsl(0, 0%, 18%);
    cursor: pointer;
  }

  .filter-modal__close:hover,
  .filter-modal__close:focus-visible {
    background-color: hsl(0, 0%, 96%);
  }

  .filter-modal__close:focus-visible {
    outline: 2px solid hsl(5, 53%, 32%);
    outline-offset: 1px;
  }

  .filter-modal__tabs {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.375rem;
    flex-shrink: 0;
  }

  .filter-modal__tab {
    box-sizing: border-box;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 2.75rem;
    padding: 0.5rem 0.375rem;
    border: 1px solid hsl(0, 0%, 83%);
    border-radius: 0.625rem;
    background: white;
    color: hsl(0, 0%, 28%);
    font: inherit;
    font-size: 0.8125rem;
    font-weight: 600;
    line-height: 1.2;
    text-align: center;
    cursor: pointer;
    transition:
      background-color 0.125s,
      border-color 0.125s,
      color 0.125s;
  }

  .filter-modal__tab--active {
    border-color: hsl(5, 53%, 32%);
    background-color: hsl(5, 53%, 32%);
    color: white;
  }

  .filter-modal__tab:hover:not(.filter-modal__tab--active),
  .filter-modal__tab:focus-visible:not(.filter-modal__tab--active) {
    border-color: hsl(5, 53%, 32%);
    color: hsl(5, 53%, 32%);
  }

  .filter-modal__tab:focus-visible {
    outline: 2px solid hsl(5, 53%, 32%);
    outline-offset: 2px;
  }

  .filter-modal__scroll {
    flex: 1 1 auto;
    min-height: 0;
    overflow-y: auto;
    overscroll-behavior: contain;
    padding: 0.125rem 0.125rem 0.25rem;
    margin: 0 -0.125rem;
  }

  .filter-modal__grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(9.5rem, 1fr));
    gap: 0.5rem;
    align-items: stretch;
  }

  .filter-modal__chip {
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 2.75rem;
    width: 100%;
    padding: 0.5rem 0.625rem;
    border: 1px solid hsl(0, 0%, 83%);
    border-radius: 0.625rem;
    background: white;
    color: hsl(0, 0%, 18%);
    font: inherit;
    font-size: 0.8125rem;
    font-weight: 500;
    line-height: 1.25;
    text-align: center;
    cursor: pointer;
    transition:
      background-color 0.125s,
      border-color 0.125s,
      color 0.125s;
  }

  .filter-modal__chip-label {
    display: -webkit-box;
    -webkit-box-orient: vertical;
    -webkit-line-clamp: 2;
    overflow: hidden;
    word-break: break-word;
  }

  .filter-modal__chip:hover,
  .filter-modal__chip:focus-visible {
    border-color: hsl(5, 53%, 32%);
    background-color: hsl(5, 53%, 98%);
    color: hsl(5, 53%, 22%);
  }

  .filter-modal__chip:focus-visible {
    outline: 2px solid hsl(5, 53%, 32%);
    outline-offset: 2px;
  }

  @media screen and (max-width: 31.25rem) {
    .filter-modal {
      max-height: min(82dvh, none);
      padding: 0.625rem 0.75rem 0.75rem;
    }

    .filter-modal__grid {
      grid-template-columns: repeat(auto-fill, minmax(8.25rem, 1fr));
    }
  }
</style>
