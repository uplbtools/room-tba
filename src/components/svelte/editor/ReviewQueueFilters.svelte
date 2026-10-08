<script lang="ts">
  import { proposalsStore } from "@lib/store.svelte";
  import {
    REVIEW_AGE_OPTIONS,
    REVIEW_ENTITY_TYPE_OPTIONS,
    hasActiveReviewFilters,
  } from "@lib/proposals/review-queue-params";

  /**
   * Review queue filters (auth audit item 17): type, submitter, age and a
   * search over labels, submitters, notes and proposed values. Applied on
   * the server, so they cover every page, not just the loaded one.
   */
  let search = $state(proposalsStore.filters.q ?? "");
  let searchTimer: ReturnType<typeof setTimeout> | undefined;

  function onSearchInput() {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      const q = search.trim() || null;
      if (q !== proposalsStore.filters.q) proposalsStore.setFilters({ q });
    }, 300);
  }

  function clearAll() {
    clearTimeout(searchTimer);
    search = "";
    proposalsStore.clearFilters();
  }

  const active = $derived(hasActiveReviewFilters(proposalsStore.filters));
</script>

<div class="review-filters" role="search" aria-label="Filter suggestions">
  <input
    type="search"
    class="review-filters-search"
    placeholder="Search suggestions"
    aria-label="Search suggestions"
    bind:value={search}
    oninput={onSearchInput}
  />
  <div class="review-filters-row">
    <select
      aria-label="Type"
      value={proposalsStore.filters.entityType ?? ""}
      onchange={(e) =>
        proposalsStore.setFilters({
          entityType: (e.currentTarget as HTMLSelectElement).value || null,
        })}
    >
      <option value="">All types</option>
      {#each REVIEW_ENTITY_TYPE_OPTIONS as option (option.value)}
        <option value={option.value}>{option.label}</option>
      {/each}
    </select>
    <select
      aria-label="Submitter"
      value={proposalsStore.filters.submitter ?? ""}
      onchange={(e) =>
        proposalsStore.setFilters({
          submitter: (e.currentTarget as HTMLSelectElement).value || null,
        })}
    >
      <option value="">Anyone</option>
      {#each proposalsStore.submitters as name (name)}
        <option value={name}>{name}</option>
      {/each}
    </select>
    <select
      aria-label="Waiting"
      value={String(proposalsStore.filters.olderThanDays ?? "")}
      onchange={(e) => {
        const value = Number((e.currentTarget as HTMLSelectElement).value);
        proposalsStore.setFilters({ olderThanDays: value > 0 ? value : null });
      }}
    >
      <option value="">Any age</option>
      {#each REVIEW_AGE_OPTIONS as days (days)}
        <option value={String(days)}>
          Waiting {days === 1 ? "over a day" : `over ${days} days`}
        </option>
      {/each}
    </select>
  </div>
  {#if active}
    <p class="review-filters-summary" role="status">
      {proposalsStore.matchCount} of {proposalsStore.pendingCount} match
      <button type="button" class="review-filters-clear" onclick={clearAll}>
        Clear filters
      </button>
    </p>
  {/if}
</div>

<style>
  .review-filters {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }
  .review-filters-search {
    width: 100%;
    box-sizing: border-box;
    min-height: 2.5rem;
  }
  .review-filters-row {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 8.5rem), 1fr));
    gap: 0.5rem;
  }
  .review-filters-row select {
    min-width: 0;
    min-height: 2.5rem;
  }
  .review-filters-summary {
    margin: 0;
    font-size: 0.8125rem;
    color: var(--theme-text-2, hsl(0, 0%, 42%));
  }
  .review-filters-clear {
    margin-left: 0.5rem;
    padding: 0;
    border: none;
    background: none;
    color: var(--theme-accent-text, hsl(5, 53%, 32%));
    font-weight: 600;
    cursor: pointer;
    text-decoration: underline;
    text-underline-offset: 2px;
  }
</style>
