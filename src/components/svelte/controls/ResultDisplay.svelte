<script lang="ts">
  import EntityEmptyState from "./EntityEmptyState.svelte";
  import EntityPanelFilter from "./EntityPanelFilter.svelte";
  import { queryStore } from "@lib/store.svelte";
  import type { RoomData } from "@lib/types";
  import RoomDisplay from "./RoomDisplay.svelte";
  import TermSelector from "@ui/TermSelector.svelte";

  /** Rows shown before "Show all N rooms"; the rest append in place. */
  const INITIAL_ROOMS = 12;
  /** Buildings with more rooms than this get a "Filter rooms…" field. */
  const FILTER_MIN_ROOMS = 8;

  interface Props {
    filteredRooms: RoomData[];
    classCounts?: Map<number, number> | null;
    sectionTitle?: string;
    emptyMessage?: string;
    groupByBuilding?: boolean;
  }
  const {
    filteredRooms,
    classCounts,
    sectionTitle = "Rooms in the building",
    emptyMessage = "No rooms found for this building.",
    groupByBuilding = false,
  }: Props = $props();

  type BuildingRoomGroup = {
    key: string;
    buildingName: string | null;
    rooms: RoomData[];
  };

  const buildingGroups = $derived.by((): BuildingRoomGroup[] | null => {
    if (!groupByBuilding) return null;

    const byBuilding = new Map<string, RoomData[]>();
    for (const room of filteredRooms) {
      const buildingName = room.building?.name ?? null;
      const key = buildingName ?? "__none__";
      const rooms = byBuilding.get(key) ?? [];
      rooms.push(room);
      byBuilding.set(key, rooms);
    }

    return Array.from(byBuilding.entries())
      .map(([key, rooms]) => ({
        key,
        buildingName: key === "__none__" ? null : key,
        rooms: rooms.sort((a, b) => a.code.localeCompare(b.code)),
      }))
      .sort((a, b) => {
        if (a.buildingName === null) return 1;
        if (b.buildingName === null) return -1;
        return a.buildingName.localeCompare(b.buildingName);
      });
  });

  // One continuous list instead of "1–10 of 17" pages (GMaps never pages a
  // place's contents). Expansion is tied to the list it was made for, so the
  // next building opens collapsed again without an effect to reset it (and a
  // background refresh of the same rooms keeps it open).
  const listKey = $derived(filteredRooms.map((room) => room.id).join(","));
  let expandedKey = $state<string | null>(null);
  const showAll = $derived(expandedKey === listKey);

  // The filter text is keyed to its list the same way, so it clears itself
  // when another building opens.
  let filter = $state({ key: "", text: "" });
  const filterText = $derived(filter.key === listKey ? filter.text : "");
  const needle = $derived(filterText.trim().toLowerCase());
  const showFilter = $derived(
    !groupByBuilding && filteredRooms.length > FILTER_MIN_ROOMS,
  );
  const matchingRooms = $derived(
    needle
      ? filteredRooms.filter((room) =>
          `${room.code} ${room.fullName ?? ""}`.toLowerCase().includes(needle),
        )
      : filteredRooms,
  );
  // While filtering, every match shows: hiding some behind "Show all" would
  // make a match look missing.
  const visibleRooms = $derived(
    showAll || needle ? matchingRooms : matchingRooms.slice(0, INITIAL_ROOMS),
  );
  const hiddenCount = $derived(matchingRooms.length - visibleRooms.length);

  function setFilter(text: string) {
    filter = { key: listKey, text };
  }

  function openBuilding(buildingName: string) {
    queryStore.updateQuery({
      type: "result",
      category: "building",
      value: buildingName,
    });
  }
</script>

{#snippet roomsEmptyIcon()}
  <svg viewBox="0 0 180 128" fill="none" aria-hidden="true">
    <!-- Doorway with a quiet hallway hint. -->
    <rect
      x="52"
      y="22"
      width="76"
      height="90"
      rx="8"
      fill="currentColor"
      opacity=".1"
    />
    <rect
      x="52"
      y="22"
      width="76"
      height="90"
      rx="8"
      stroke="currentColor"
      stroke-width="3"
    />
    <path
      d="M70 112V38h40v74"
      stroke="currentColor"
      stroke-width="3"
      stroke-linejoin="round"
      fill="currentColor"
      fill-opacity=".06"
    />
    <circle cx="102" cy="74" r="3.5" fill="currentColor" opacity=".85" />
    <path
      d="M40 112h100"
      stroke="currentColor"
      stroke-width="3"
      stroke-linecap="round"
      opacity=".35"
    />
  </svg>
{/snippet}

<section class="entity-list-section rooms-section">
  <h3 class="entity-section-heading">{sectionTitle}</h3>
  <TermSelector />
  {#if groupByBuilding && buildingGroups}
    {#if buildingGroups.length === 0}
      <EntityEmptyState
        title="Empty floors for now"
        description={emptyMessage}
        icon={roomsEmptyIcon}
      />
    {:else}
      <div class="building-groups">
        {#each buildingGroups as group (group.key)}
          <section
            class="building-group"
            aria-label={group.buildingName ?? "Unassigned rooms"}
          >
            {#if group.buildingName}
              <button
                type="button"
                class="entity-nav-chip"
                onclick={() => openBuilding(group.buildingName!)}
              >
                {group.buildingName}
              </button>
            {:else}
              <p class="building-group__label">No building assigned</p>
            {/if}
            <div class="room-list room-list--nested">
              {#each group.rooms as room (room.id)}
                <RoomDisplay
                  {room}
                  searchInput=""
                  classCount={classCounts?.get(room.id)}
                />
              {/each}
            </div>
          </section>
        {/each}
      </div>
    {/if}
  {:else}
    {#if showFilter}
      <EntityPanelFilter
        search
        value={filterText}
        label="Filter rooms"
        placeholder="Filter rooms…"
        oninput={(event) =>
          setFilter((event.currentTarget as HTMLInputElement).value)}
        onclear={() => setFilter("")}
      />
    {/if}
    <div class="room-list">
      {#each visibleRooms as room (room.id)}
        <RoomDisplay
          {room}
          searchInput={filterText}
          classCount={classCounts?.get(room.id)}
        />
      {/each}

      {#if needle && matchingRooms.length === 0}
        <p class="rooms-filter-empty" role="status">
          No rooms match “{filterText.trim()}”
        </p>
      {/if}

      {#if hiddenCount > 0}
        <button
          type="button"
          class="rooms-show-all"
          onclick={() => (expandedKey = listKey)}
        >
          Show all {filteredRooms.length} rooms
        </button>
      {/if}

      {#if filteredRooms.length === 0}
        <EntityEmptyState
          title="Empty floors for now"
          description={emptyMessage}
          icon={roomsEmptyIcon}
        />
      {/if}
    </div>
  {/if}
</section>

<style>
  @import "./entity-detail.css";

  .rooms-section {
    flex: 1 1 0;
    gap: 0.5rem;
  }

  .room-list {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    flex: 1 0 0;
  }

  .building-groups {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    flex: 1 0 0;
  }

  .building-group {
    display: flex;
    flex-direction: column;
    gap: 0.375rem;
  }

  .building-group__label {
    margin: 0;
    padding: 0 0.5rem;
    font-size: 0.8125rem;
    font-weight: 600;
    color: var(--theme-text-2, #71717a);
  }

  .room-list--nested {
    flex: 0 0 auto;
  }

  .rooms-filter-empty {
    margin: 0;
    padding: 0.75rem 0.5rem;
    font-size: 0.8125rem;
    text-align: center;
    color: var(--theme-text-2, #52525b);
  }

  /* Same secondary pill as "Show all past events", full width. Explicit box
     model: without it the label sat flush against the left of the pill. */
  .rooms-show-all {
    align-self: stretch;
    box-sizing: border-box;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 2.75rem;
    margin-top: 0.25rem;
    padding: 0.5rem 1rem;
    text-align: center;
    border: 1px solid var(--theme-accent-border, #c58f91);
    border-radius: 999px;
    background: var(--theme-surface, #fff);
    color: var(--theme-accent-text, hsl(5, 65%, 22%));
    font: inherit;
    font-size: 0.8125rem;
    font-weight: 700;
    cursor: pointer;
  }

  .rooms-show-all:hover,
  .rooms-show-all:focus-visible {
    background: var(--theme-accent-soft, #fdf3f3);
  }

  .rooms-show-all:focus-visible {
    outline: 2px solid var(--theme-accent-text, #7b1113);
    outline-offset: 2px;
  }
</style>
