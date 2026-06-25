<script lang="ts">
  import { Building2, X } from "@lucide/svelte";
  import {
    getBuildingTypeFilterLabel,
    getBuildingTypeFilterOptions,
  } from "../../constants/building-types";
  import { getAppData } from "../../lib/context";
  import {
    buildingTypeFilter,
    floatingControlPanelStore,
  } from "../../lib/store.svelte";
  import type { BuildingTypeFilter } from "../../constants/building-types";

  const appData = getAppData();
  const { buildings, dorms } = $derived(appData());
  const panelId = "building-type";
  const menuOpen = $derived(floatingControlPanelStore.openPanel === panelId);

  const options = $derived(getBuildingTypeFilterOptions(buildings, dorms));
  const activeLabel = $derived(
    getBuildingTypeFilterLabel(buildingTypeFilter.value),
  );
  const hasActiveFilter = $derived(buildingTypeFilter.value !== "all");

  function selectFilter(value: BuildingTypeFilter) {
    buildingTypeFilter.set(value);
    floatingControlPanelStore.close(panelId);
  }
</script>

<div class="building-type-control">
  {#if menuOpen}
    <div class="filter-panel" role="menu" aria-label="Building type filter">
      <div class="filter-panel-header">
        <span>Building Type</span>
        <button
          type="button"
          class="close-btn"
          onclick={() => floatingControlPanelStore.close(panelId)}
          aria-label="Close building type filter"
        >
          <X size="16" />
        </button>
      </div>

      <p class="filter-copy">Show building and dorm pins by type.</p>

      <div class="filter-options">
        {#each options as option (option.value)}
          {@const isActive = buildingTypeFilter.value === option.value}
          <button
            type="button"
            class="filter-option"
            class:active={isActive}
            role="menuitemradio"
            aria-checked={isActive}
            onclick={() => selectFilter(option.value)}
          >
            <span class="option-label">
              <span class={`type-dot ${option.tone}`}></span>
              {option.label}
            </span>
            <span class="option-count">{option.count}</span>
          </button>
        {/each}
      </div>
    </div>
  {/if}

  <button
    class="filter-btn"
    class:active={hasActiveFilter}
    onclick={() => floatingControlPanelStore.toggle(panelId)}
    title={`Building Type: ${activeLabel}`}
    aria-label={`Building Type: ${activeLabel}`}
    aria-expanded={menuOpen}
    aria-pressed={hasActiveFilter}
  >
    <Building2 />
  </button>
</div>

<style>
  .building-type-control {
    pointer-events: auto;
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 0.5rem;
  }

  .filter-btn {
    display: flex;
    width: 3rem;
    height: 3rem;
    align-items: center;
    justify-content: center;
    border: 1px solid #ececec;
    border-radius: 50%;
    background-color: white;
    color: hsl(5, 53%, 32%);
    cursor: pointer;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    transition:
      background-color 0.2s,
      transform 0.2s;
  }

  .filter-btn:hover {
    background-color: hsl(5, 53%, 98%);
    transform: scale(1.05);
  }

  .filter-btn.active {
    border-color: hsl(160, 84%, 26%);
    background-color: hsl(160, 84%, 26%);
    color: white;
  }

  .filter-panel {
    display: flex;
    width: 18rem;
    max-width: calc(100vw - 1rem);
    flex-direction: column;
    gap: 0.625rem;
    border-radius: 0.875rem;
    background-color: white;
    padding: 0.75rem;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  }

  .filter-panel-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.125rem 0.25rem;
    color: hsl(0, 0%, 20%);
    font-size: 0.875rem;
    font-weight: 600;
  }

  .close-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    border-radius: 0.375rem;
    background: transparent;
    color: hsl(0, 0%, 40%);
    cursor: pointer;
    padding: 0.125rem;
  }

  .close-btn:hover {
    background-color: hsl(0, 0%, 95%);
  }

  .filter-copy {
    margin: 0;
    color: hsl(0, 0%, 38%);
    font-size: 0.75rem;
    line-height: 1.35;
  }

  .filter-options {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .filter-option {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.625rem;
    border: 1px solid transparent;
    border-radius: 0.625rem;
    background-color: hsl(0, 0%, 98%);
    color: hsl(0, 0%, 15%);
    cursor: pointer;
    font: inherit;
    font-size: 0.8125rem;
    font-weight: 600;
    padding: 0.5rem 0.625rem;
    text-align: left;
    transition:
      background-color 0.15s,
      border-color 0.15s;
  }

  .filter-option:hover {
    background-color: hsl(0, 0%, 94%);
  }

  .filter-option.active {
    border-color: hsl(5, 53%, 75%);
    background-color: hsl(5, 53%, 96%);
    color: hsl(5, 53%, 32%);
  }

  .option-count {
    border-radius: 999px;
    background-color: white;
    color: hsl(0, 0%, 38%);
    font-size: 0.75rem;
    font-weight: 700;
    padding: 0.125rem 0.5rem;
  }

  .option-label {
    display: inline-flex;
    align-items: center;
    gap: 0.5rem;
  }

  .type-dot {
    width: 0.625rem;
    height: 0.625rem;
    border-radius: 50%;
    background-color: hsl(0, 0%, 65%);
    box-shadow: 0 0 0 2px white;
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
</style>
