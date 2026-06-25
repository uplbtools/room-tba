<script lang="ts">
  import { queryStore } from "../../../lib/store.svelte";
  import { getAppData } from "../../../lib/context";
  import type { RoomData } from "../../../lib/types";
  import {
    getDivisionRooms,
    getJSONFetch,
  } from "../../../lib/local/data/utils";
  import ResultDisplay from "./ResultDisplay.svelte";
  import {
    checkLocalDivisionRoom,
    syncDivisionRooms,
  } from "../../../lib/local/data/sync";
  import { onMount } from "svelte";

  const appData = getAppData();
  const { divisions, loaded } = $derived(appData());

  const division = $derived(
    loaded
      ? divisions.find((d) => d.divisionName === queryStore.queryValue)
      : null,
  );

  let divisionRooms = $state<RoomData[] | null>(null);

  onMount(async () => {
    if (!division) return;
    const divisionChecker = await checkLocalDivisionRoom(division.id);
    divisionRooms = await getDivisionRooms(divisionChecker, division.id);
    await syncDivisionRooms(divisionChecker, division.id, divisionRooms);
  });
  // const divisionRooms = $derived(
  //   rooms.filter((room) => room.divisionName === queryStore.queryValue),
  // );
</script>

<div class="division-query-wrapper">
  {#if division}
    <div class="division-header">
      <h2 class="division-title">{division.divisionName}</h2>
    </div>
  {/if}
  {#if divisionRooms}
    <ResultDisplay filteredRooms={divisionRooms} />
  {:else}
    Loading data...
  {/if}
</div>

<style>
  .division-query-wrapper {
    display: flex;
    flex-direction: column;
    gap: 0.75rem; /* 12px gap from design */
    width: 100%;
    flex: 1 1 0;
    overflow-y: auto;
  }

  .division-header {
    display: flex;
    flex-direction: column;
    gap: 0.25rem; /* 4px gap */
    width: 100%;
    flex-shrink: 0;
  }

  .division-title {
    font-size: 1.125rem; /* 18px */
    font-weight: bold;
    color: black;
    margin: 0;
    line-height: 1.25rem; /* 20px */
  }
</style>
