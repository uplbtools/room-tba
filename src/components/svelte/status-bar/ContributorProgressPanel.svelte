<script lang="ts">
  import LoadingIndicator from "@ui/LoadingIndicator.svelte";
  import { onMount } from "svelte";
  import { getAppData } from "@lib/context";
  import {
    ROOM_FIELD_CATEGORIES,
    ROOM_FIELD_LABELS,
    fetchContributorProgress,
    missingFieldLabel,
    progressPercent,
    type BuildingContributorProgress,
    type CampusContributorProgress,
    type MineContributorProgress,
    type RoomFieldCategory,
  } from "@lib/contributor-progress";
  import { adminAuthStore } from "@lib/store.svelte";
  import MapChromeGhostButton from "@ui/map-chrome/MapChromeGhostButton.svelte";

  type ScopeTab = "campus" | "building" | "mine";

  type Props = {
    defaultBuildingId?: number | null;
  };

  const { defaultBuildingId = null }: Props = $props();

  const appData = getAppData();
  const buildings = $derived(appData().buildings ?? []);

  let activeScope = $state<ScopeTab>("campus");
  let selectedBuildingId = $state<number | null>(defaultBuildingId);
  let campusData = $state<CampusContributorProgress | null>(null);
  let buildingData = $state<BuildingContributorProgress | null>(null);
  let mineData = $state<MineContributorProgress | null>(null);
  let loading = $state(false);
  let error = $state<string | null>(null);

  const showMineTab = $derived(adminAuthStore.isLoggedIn);

  $effect(() => {
    if (selectedBuildingId == null && buildings.length > 0) {
      selectedBuildingId = buildings[0]?.id ?? null;
    }
  });

  onMount(() => {
    void loadScope("campus");
  });

  async function loadScope(scope: ScopeTab) {
    activeScope = scope;
    loading = true;
    error = null;

    try {
      if (scope === "campus") {
        campusData = await fetchContributorProgress("campus");
      } else if (scope === "building") {
        if (selectedBuildingId == null) {
          buildingData = null;
          return;
        }
        buildingData = await fetchContributorProgress(
          "building",
          selectedBuildingId,
        );
      } else {
        mineData = await fetchContributorProgress("mine");
      }
    } catch (loadError) {
      error =
        loadError instanceof Error
          ? loadError.message
          : "Could not load progress.";
    } finally {
      loading = false;
    }
  }

  function selectScope(scope: ScopeTab) {
    void loadScope(scope);
  }

  function handleBuildingChange(event: Event) {
    const value = Number((event.currentTarget as HTMLSelectElement).value);
    selectedBuildingId = Number.isFinite(value) ? value : null;
    if (activeScope === "building") {
      void loadScope("building");
    }
  }

  function fieldRows(
    counts: Record<RoomFieldCategory, { filled: number; total: number }>,
  ) {
    return ROOM_FIELD_CATEGORIES.map((category) => ({
      category,
      label: ROOM_FIELD_LABELS[category],
      filled: counts[category].filled,
      total: counts[category].total,
      percent: progressPercent(counts[category].filled, counts[category].total),
    }));
  }

  function formatEntityType(entityType: string): string {
    return entityType.charAt(0).toUpperCase() + entityType.slice(1);
  }
</script>

<section class="contributor-progress" aria-label="Contributor progress">
  <div
    class="contributor-progress__tabs"
    role="tablist"
    aria-label="Progress scope"
  >
    <MapChromeGhostButton
      variant={activeScope === "campus" ? "accent" : "muted"}
      onclick={() => selectScope("campus")}
    >
      Campus
    </MapChromeGhostButton>
    <MapChromeGhostButton
      variant={activeScope === "building" ? "accent" : "muted"}
      onclick={() => selectScope("building")}
    >
      Building
    </MapChromeGhostButton>
    {#if showMineTab}
      <MapChromeGhostButton
        variant={activeScope === "mine" ? "accent" : "muted"}
        onclick={() => selectScope("mine")}
      >
        My work
      </MapChromeGhostButton>
    {/if}
  </div>

  {#if activeScope === "building"}
    <label class="contributor-progress__building-picker">
      <span class="contributor-progress__label">Building</span>
      <select
        class="contributor-progress__select"
        value={selectedBuildingId ?? ""}
        onchange={handleBuildingChange}
      >
        {#each buildings as building (building.id)}
          <option value={building.id}>{building.buildingName}</option>
        {/each}
      </select>
    </label>
  {/if}

  {#if loading}
    <p class="contributor-progress__status">
      <LoadingIndicator label="Loading progress…" />
    </p>
  {:else if error}
    <p class="contributor-progress__status contributor-progress__status--error">
      {error}
    </p>
  {:else if activeScope === "campus" && campusData}
    {#if campusData.termLabel}
      <p class="contributor-progress__meta">
        Schedule counts use {campusData.termLabel}.
      </p>
    {/if}

    <div class="contributor-progress__group" aria-label="Room completeness">
      <h3 class="contributor-progress__heading">Rooms</h3>
      {#each fieldRows(campusData.rooms) as row (row.category)}
        <div
          class="contributor-progress__field"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={row.total}
          aria-valuenow={row.filled}
          aria-label="{row.label}: {row.filled} of {row.total}"
        >
          <div class="contributor-progress__field-head">
            <span>{row.label}</span>
            <span>{row.filled}/{row.total}</span>
          </div>
          <div class="map-chrome-progress">
            <div
              class="map-chrome-progress__value"
              style:width={`${row.percent}%`}
            ></div>
          </div>
        </div>
      {/each}
    </div>

    <div class="contributor-progress__group" aria-label="Building completeness">
      <h3 class="contributor-progress__heading">Buildings</h3>
      {#each [{ label: "Map pins", count: campusData.buildings.pins }, { label: "Directions", count: campusData.buildings.directions }] as row (row.label)}
        {@const percent = progressPercent(row.count.filled, row.count.total)}
        <div
          class="contributor-progress__field"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={row.count.total}
          aria-valuenow={row.count.filled}
          aria-label="{row.label}: {row.count.filled} of {row.count.total}"
        >
          <div class="contributor-progress__field-head">
            <span>{row.label}</span>
            <span>{row.count.filled}/{row.count.total}</span>
          </div>
          <div class="map-chrome-progress">
            <div
              class="map-chrome-progress__value"
              style:width={`${percent}%`}
            ></div>
          </div>
        </div>
      {/each}
    </div>

    {#if campusData.topBuildings.length > 0}
      <div class="contributor-progress__group" aria-label="Buildings with gaps">
        <h3 class="contributor-progress__heading">Buildings needing work</h3>
        <ul class="contributor-progress__list">
          {#each campusData.topBuildings as building (building.buildingId)}
            <li>
              <span class="contributor-progress__list-title"
                >{building.buildingName}</span
              >
              <span class="contributor-progress__list-meta">
                {building.directions.filled}/{building.roomTotal} directions ·
                {building.schedule.filled}/{building.roomTotal} schedules ·
                {building.position.filled}/{building.roomTotal} pins
              </span>
            </li>
          {/each}
        </ul>
      </div>
    {/if}
  {:else if activeScope === "building" && buildingData}
    {#if buildingData.termLabel}
      <p class="contributor-progress__meta">
        {buildingData.buildingName} · schedule counts use {buildingData.termLabel}.
      </p>
    {:else}
      <p class="contributor-progress__meta">{buildingData.buildingName}</p>
    {/if}

    {#each fieldRows(buildingData.rooms) as row (row.category)}
      <div
        class="contributor-progress__field"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={row.total}
        aria-valuenow={row.filled}
        aria-label="{row.label}: {row.filled} of {row.total}"
      >
        <div class="contributor-progress__field-head">
          <span>{row.label}</span>
          <span>{row.filled}/{row.total}</span>
        </div>
        <div class="map-chrome-progress">
          <div
            class="map-chrome-progress__value"
            style:width={`${row.percent}%`}
          ></div>
        </div>
      </div>
    {/each}

    {#if buildingData.roomRows.length === 0}
      <p class="contributor-progress__status">No rooms in this building yet.</p>
    {:else}
      <ul class="contributor-progress__checklist" aria-label="Room checklist">
        {#each buildingData.roomRows as room (room.id)}
          <li class="contributor-progress__checklist-item">
            <span class="contributor-progress__room-code">{room.code}</span>
            {#if room.missingFields.length === 0}
              <span class="contributor-progress__complete">Complete</span>
            {:else}
              <ul class="contributor-progress__gaps">
                {#each room.missingFields as category (category)}
                  <li>{missingFieldLabel(room.code, category)}</li>
                {/each}
              </ul>
            {/if}
          </li>
        {/each}
      </ul>
    {/if}
  {:else if activeScope === "mine" && mineData}
    <p class="contributor-progress__meta">
      {mineData.totalEdits} edits recorded for {mineData.editedBy}.
    </p>
    {#if mineData.totalEdits === 0}
      <p class="contributor-progress__status">
        No published edits in history yet.
      </p>
    {:else}
      <ul class="contributor-progress__list">
        {#each Object.entries(mineData.byEntityType).sort( ([a], [b]) => a.localeCompare(b) ) as [entityType, count] (entityType)}
          <li>
            <span class="contributor-progress__list-title"
              >{formatEntityType(entityType)}</span
            >
            <span class="contributor-progress__list-meta">{count} edits</span>
          </li>
        {/each}
      </ul>
    {/if}
  {/if}
</section>

<style>
  .contributor-progress {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    min-width: 0;
  }

  .contributor-progress__tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 0.25rem;
  }

  .contributor-progress__building-picker {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    min-width: 0;
  }

  .contributor-progress__label,
  .contributor-progress__meta,
  .contributor-progress__status {
    margin: 0;
    font-size: 0.75rem;
    font-weight: 500;
    color: hsl(0, 0%, 38%);
  }

  .contributor-progress__status--error {
    color: hsl(0, 45%, 40%);
  }

  .contributor-progress__select {
    width: 100%;
    max-width: 100%;
    font: inherit;
    font-size: 0.8125rem;
    padding: 0.25rem 0.375rem;
    border: 1px solid hsl(0, 0%, 82%);
    border-radius: 0.375rem;
    background: hsl(0, 0%, 100%);
  }

  .contributor-progress__group {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .contributor-progress__heading {
    margin: 0;
    font-size: 0.75rem;
    font-weight: 700;
    color: hsl(0, 0%, 28%);
  }

  .contributor-progress__field {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    min-width: 0;
  }

  .contributor-progress__field-head {
    display: flex;
    justify-content: space-between;
    gap: 0.5rem;
    font-size: 0.75rem;
    font-weight: 600;
    color: hsl(0, 0%, 32%);
  }

  .contributor-progress__list,
  .contributor-progress__checklist,
  .contributor-progress__gaps {
    margin: 0;
    padding: 0;
    list-style: none;
  }

  .contributor-progress__list li,
  .contributor-progress__checklist-item {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
    padding: 0.375rem 0;
    border-top: 1px solid hsl(0, 0%, 90%);
    min-width: 0;
  }

  .contributor-progress__list-title,
  .contributor-progress__room-code {
    font-size: 0.8125rem;
    font-weight: 700;
    color: hsl(0, 0%, 22%);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .contributor-progress__list-meta,
  .contributor-progress__gaps li,
  .contributor-progress__complete {
    font-size: 0.75rem;
    font-weight: 500;
    color: hsl(0, 0%, 40%);
  }

  .contributor-progress__complete {
    color: hsl(130, 25%, 32%);
  }
</style>
