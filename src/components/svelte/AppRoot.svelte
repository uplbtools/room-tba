<script lang="ts">
  import { isBrowser } from "es-toolkit";
  import type { InitialSearchState } from "../../lib/app-data";
  import {
    type AppContextData,
    type DBData,
    setAppData,
  } from "../../lib/context";
  import { queryStore } from "../../lib/store.svelte";
  import type {
    BuildingData,
    ClassMapValue,
    CollegeData,
    DivisionData,
    DormData,
    RoomData,
  } from "../../lib/types";
  import Entry from "./Entry.svelte";
  import { onMount } from "svelte";
  import {
    getSyncedBuildings,
    getSyncedColleges,
    getSyncedDivisions,
    getSyncedDorms,
    getSyncedRooms,
    getSyncedRoomsData,
  } from "../../lib/local/data/sync";
  import {
    getLocalBuildings,
    getLocalColleges,
    getLocalDivisions,
    getLocalDorms,
    getLocalRooms,
    syncBuildings,
    syncColleges,
    syncDivisions,
    syncDorms,
    syncRooms,
  } from "../../lib/local/data/utils";
  import { getDB, initPGLiteDB } from "../../lib/local/data/pgliteDB";

  type MetadataProps = {
    initialSearch?: InitialSearchState;
    suppressLandingModal?: boolean;
  };
  const metadata: MetadataProps = $props();

  let buildings: BuildingData[] | null = $state.raw(null);
  let colleges: CollegeData[] | null = $state.raw(null);
  let classes: ClassMapValue[] | null = $state.raw(null);
  let directionCount: number | null = $state.raw(null);
  let divisions: DivisionData[] | null = $state.raw(null);
  let dorms: DormData[] | null = $state.raw(null);
  let rooms: RoomData[] | null = $state.raw(null);
  let totalRooms: number | null = $state.raw(null);
  let loaded: boolean = $state(false);
  const appData: AppContextData = $derived({
    buildings,
    colleges,
    directionCount,
    divisions,
    dorms,
    rooms,
    totalRooms,
    loaded,
  });

  queryStore.hydrateQuery(
    // svelte-ignore state_referenced_locally
    metadata.initialSearch
      ? {
          category: metadata.initialSearch.category,
          type: "result",
          value: metadata.initialSearch.value,
        }
      : {
          category: null,
          type: "query",
          value: "",
        },
  );

  onMount(async () => {
    let data: DBData;
    const localDB = await getDB();
    Promise.resolve()
      .then(() => initPGLiteDB(localDB))
      .catch((e) => console.error(e))
      .then(async () => {
        data = {
          buildings: await getSyncedBuildings(),
          colleges: await getSyncedColleges(),
          divisions: await getSyncedDivisions(),
          dorms: await getSyncedDorms(),
          rooms: await getSyncedRooms(),
          ...(await getSyncedRoomsData()),
        };
      })
      .then(() => loadAppData(data));
  });

  function loadAppData(data: DBData) {
    buildings = data.buildings;
    colleges = data.colleges;
    directionCount = data.directionCount;
    divisions = data.divisions;
    dorms = data.dorms;
    rooms = data.rooms;
    totalRooms = data.totalRooms;
    loaded = true;
    Promise.resolve()
      .then(() => syncBuildings(data.buildings ?? []))
      .then(() => syncColleges(data.colleges ?? []))
      .then(() => syncDivisions(data.divisions ?? []))
      .then(() => syncDorms(data.dorms ?? []))
      .then(() => syncRooms(data.rooms ?? []));
  }

  // svelte-ignore state_referenced_locally
  setAppData(() => appData);

  $inspect(classes);
</script>

{#if appData.loaded}
  <Entry
    initialSearch={metadata.initialSearch}
    suppressLandingModal={metadata.suppressLandingModal ?? false}
  />
{/if}
