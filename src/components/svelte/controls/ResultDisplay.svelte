<script lang="ts">
  import EntityPagination from "./EntityPagination.svelte";
  import { queryStore } from "@lib/store.svelte";
  import type { RoomData } from "@lib/types";
  import RoomDisplay from "./RoomDisplay.svelte";
  import TermSelector from "@ui/TermSelector.svelte";

  const MAX_DISPLAY_RESULT = 12;
  let paginateOffset = $state(0);

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

  const paginatedRooms = $derived(
    filteredRooms.slice(
      paginateOffset * MAX_DISPLAY_RESULT,
      (paginateOffset + 1) * MAX_DISPLAY_RESULT,
    ),
  );
  const maxPaginateOffset = $derived(
    Math.max(1, Math.ceil(filteredRooms.length / MAX_DISPLAY_RESULT)),
  );
  const pageStart = $derived(paginateOffset * MAX_DISPLAY_RESULT + 1);
  const pageEnd = $derived(
    Math.min((paginateOffset + 1) * MAX_DISPLAY_RESULT, filteredRooms.length),
  );

  function openBuilding(buildingName: string) {
    queryStore.updateQuery({
      type: "result",
      category: "building",
      value: buildingName,
    });
  }
</script>

<section class="entity-list-section rooms-section">
  <h3 class="entity-section-heading">{sectionTitle}</h3>
  <TermSelector />
  {#if groupByBuilding && buildingGroups}
    {#if buildingGroups.length === 0}
      <p class="entity-empty-state">{emptyMessage}</p>
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
      {#each paginatedRooms as room (room.id)}
        <RoomDisplay
          {room}
          searchInput=""
          classCount={classCounts?.get(room.id)}
        />
      {/each}

      {#if filteredRooms.length === 0}
        <p class="entity-empty-state">{emptyMessage}</p>
      {/if}
    </div>
  {/if}
</section>

{#if !groupByBuilding && maxPaginateOffset > 1}
  <EntityPagination
    rangeStart={pageStart}
    rangeEnd={pageEnd}
    total={filteredRooms.length}
    prevDisabled={paginateOffset === 0}
    nextDisabled={paginateOffset === maxPaginateOffset - 1}
    onPrevious={() => (paginateOffset -= 1)}
    onNext={() => (paginateOffset += 1)}
  />
{/if}

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
</style>
