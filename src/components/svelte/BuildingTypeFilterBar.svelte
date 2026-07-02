<script lang="ts">
  import GraduationCap from "@lucide/svelte/icons/graduation-cap";
  import House from "@lucide/svelte/icons/house";
  import Landmark from "@lucide/svelte/icons/landmark";
  import Layers from "@lucide/svelte/icons/layers";
  import Shield from "@lucide/svelte/icons/shield";
  import {
    getBuildingTypeFilterOptions,
    type BuildingTypeFilter,
  } from "@constants/building-types";
  import { getAppData } from "@lib/context";
  import { buildingTypeFilter, jeepneyStore, queryStore } from "@lib/store.svelte";
  import "./map-chrome/map-chrome.css";

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

  const FILTER_ICONS = {
    all: Layers,
    "class-building": GraduationCap,
    "administrative-building": Landmark,
    "up-managed-dorm": Shield,
    "non-up-managed-dorm": House,
  } as const;

  const pinFilterContext = $derived(
    queryStore.category !== "classes" && queryStore.category !== "browse",
  );

  function selectFilter(value: BuildingTypeFilter) {
    // Non-All pin filters are mutually exclusive with the transit layer:
    // turn off jeepney routes/stops so filtered pins aren't obscured (#325).
    if (value !== "all") jeepneyStore.disableLayer();
    buildingTypeFilter.set(value);
  }
</script>

<div
  class="building-filter-bar"
  role="toolbar"
  aria-label="Building pin filters"
>
  <span class="filter-heading sr-only">Show</span>
  <div class="filter-chips">
    {#each options as option (option.value)}
      {@const isActive =
        pinFilterContext && buildingTypeFilter.value === option.value}
      {@const Icon = FILTER_ICONS[option.value]}
      <button
        type="button"
        class="map-chrome-chip"
        class:map-chrome-chip--filter-selected={isActive}
        aria-pressed={isActive}
        aria-label={`${option.label}, ${option.count} pins`}
        title={`${option.label} (${option.count})`}
        onclick={() => selectFilter(option.value)}
      >
        <span
          class="map-chrome-chip__icon map-chrome-chip__icon--{option.tone}"
          aria-hidden="true"
        >
          <Icon size={14} />
        </span>
        <span>{CHIP_LABELS[option.value]}</span>
        <span class="map-chrome-chip__count">{option.count}</span>
      </button>
    {/each}
  </div>
</div>

<style>
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .building-filter-bar {
    display: flex;
    align-items: center;
    gap: 0.375rem;
    flex: 0 0 auto;
    min-width: 0;
    pointer-events: auto;
  }

  .filter-chips {
    display: flex;
    flex: 0 0 auto;
    align-items: center;
    gap: 0.375rem;
    min-width: 0;
  }
</style>
