<script lang="ts">
  import {
    getBuildingTypeFilterOptions,
    type BuildingTypeFilter,
  } from "@constants/building-types";
  import { getAppData } from "@lib/context";
  import { buildingTypeFilter } from "@lib/store.svelte";

  const appData = getAppData();
  const { buildings, dorms } = $derived(appData());

  const options = $derived(getBuildingTypeFilterOptions(buildings, dorms));

  const CHIP_LABELS: Record<BuildingTypeFilter, string> = {
    all: "All",
    "class-building": "Class",
    "administrative-building": "Admin",
    "up-managed-dorm": "UP dorms",
    "non-up-managed-dorm": "Other dorms",
  };

  function selectFilter(value: BuildingTypeFilter) {
    buildingTypeFilter.set(value);
  }
</script>

<div
  class="building-filter-bar"
  role="toolbar"
  aria-label="Building pin filters"
>
  <span class="filter-heading">Show</span>
  <div class="filter-chips">
    {#each options as option (option.value)}
      {@const isActive = buildingTypeFilter.value === option.value}
      <button
        type="button"
        class="filter-chip"
        class:active={isActive}
        aria-pressed={isActive}
        aria-label={`${option.label}, ${option.count} pins`}
        title={`${option.label} (${option.count})`}
        onclick={() => selectFilter(option.value)}
      >
        <span class={`type-dot ${option.tone}`} aria-hidden="true"></span>
        <span class="chip-label">{CHIP_LABELS[option.value]}</span>
        <span class="chip-count">{option.count}</span>
      </button>
    {/each}
  </div>
</div>

<style>
  .building-filter-bar {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    min-width: 0;
    width: 100%;
    pointer-events: auto;
  }

  .filter-heading {
    flex: 0 0 auto;
    color: hsl(0, 0%, 38%);
    font-size: 0.6875rem;
    font-weight: 700;
    letter-spacing: 0.02em;
    text-transform: uppercase;
  }

  .filter-chips {
    display: flex;
    flex: 1 1 auto;
    align-items: center;
    gap: 0.375rem;
    min-width: 0;
    overflow-x: auto;
    overscroll-behavior-x: contain;
    scrollbar-width: thin;
    -webkit-overflow-scrolling: touch;
    padding-bottom: 1px;
  }

  .filter-chip {
    display: inline-flex;
    flex: 0 0 auto;
    align-items: center;
    gap: 0.3rem;
    min-height: 1.75rem;
    border: 1px solid var(--map-chrome-border, hsl(0, 0%, 58%));
    border-radius: 999px;
    background: var(--map-chrome-surface, rgba(255, 255, 255, 0.98));
    color: hsl(0, 0%, 22%);
    cursor: pointer;
    font: inherit;
    font-size: 0.6875rem;
    font-weight: 700;
    line-height: 1.1;
    padding: 0.25rem 0.5rem;
    white-space: nowrap;
    box-shadow: 0 1px 3px hsla(0, 0%, 0%, 0.1);
  }

  .filter-chip:hover,
  .filter-chip:focus-visible {
    border-color: hsl(5, 40%, 72%);
    background: hsl(5, 53%, 98%);
  }

  .filter-chip:focus-visible {
    outline: 2px solid hsl(5, 53%, 32%);
    outline-offset: 1px;
  }

  .filter-chip.active {
    border-color: hsl(5, 53%, 32%);
    background: hsl(5, 53%, 32%);
    color: white;
  }

  .filter-chip.active .chip-count {
    background: hsla(0, 0%, 100%, 0.18);
    color: white;
  }

  .type-dot {
    width: 0.5rem;
    height: 0.5rem;
    border-radius: 50%;
    background-color: hsl(0, 0%, 65%);
    flex: 0 0 auto;
  }

  .type-dot.building,
  .type-dot.admin {
    background-color: hsl(5, 53%, 32%);
  }

  .type-dot.up-dorm {
    background-color: hsl(170, 50%, 35%);
  }

  .type-dot.non-up-dorm {
    background-color: hsl(25, 70%, 50%);
  }

  .filter-chip.active .type-dot {
    box-shadow: 0 0 0 1px hsla(0, 0%, 100%, 0.65);
  }

  .chip-count {
    border-radius: 999px;
    background: hsl(0, 0%, 94%);
    color: hsl(0, 0%, 38%);
    font-size: 0.625rem;
    font-weight: 700;
    line-height: 1;
    padding: 0.125rem 0.35rem;
  }

  @media (max-width: 48rem) {
    .building-filter-bar {
      padding: 0.375rem 0.625rem 0.5rem;
    }

    .filter-heading {
      display: none;
    }
  }
</style>
