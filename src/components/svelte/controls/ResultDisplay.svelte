<script lang="ts">
  import EntityEmptyState from "./EntityEmptyState.svelte";
  import { queryStore } from "@lib/store.svelte";
  import type { RoomData } from "@lib/types";
  import RoomDisplay from "./RoomDisplay.svelte";
  import TermSelector from "@ui/TermSelector.svelte";

  /** Rows shown before "Show all N rooms"; the rest append in place. */
  const INITIAL_ROOMS = 12;

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
  const visibleRooms = $derived(
    showAll ? filteredRooms : filteredRooms.slice(0, INITIAL_ROOMS),
  );
  const hiddenCount = $derived(filteredRooms.length - visibleRooms.length);

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
    <div class="room-list">
      {#each visibleRooms as room (room.id)}
        <RoomDisplay
          {room}
          searchInput=""
          classCount={classCounts?.get(room.id)}
        />
      {/each}

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
    color: #71717a;
  }

  .room-list--nested {
    flex: 0 0 auto;
  }

  .rooms-show-all {
    align-self: stretch;
    min-height: 2.75rem;
    margin-top: 0.25rem;
    border: 1px solid #c58f91;
    border-radius: 999px;
    background: #fff;
    color: hsl(5, 65%, 22%);
    font: inherit;
    font-size: 0.8125rem;
    font-weight: 700;
    cursor: pointer;
  }

  .rooms-show-all:hover,
  .rooms-show-all:focus-visible {
    background: #fdf3f3;
  }

  .rooms-show-all:focus-visible {
    outline: 2px solid #7b1113;
    outline-offset: 2px;
  }
</style>
