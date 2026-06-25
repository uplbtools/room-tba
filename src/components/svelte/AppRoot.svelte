<script lang="ts">
  import type { InitialSearchState } from "../../lib/app-data";
  import {
    type AppContextData,
    type DBData,
    setAppData,
  } from "../../lib/context";
  import { queryStore, syncToastStore } from "../../lib/store.svelte";
  import type {
    BuildingData,
    CollegeData,
    DivisionData,
    DormData,
  } from "../../lib/types";
  import Entry from "./Entry.svelte";
  import { onMount } from "svelte";
  import {
    getBuildings,
    getColleges,
    getDivisions,
    getDorms,
    getRoomsData,
  } from "../../lib/local/data/utils";
  import {
    localTableSyncCheck,
    syncBuildings,
    syncColleges,
    syncDivisions,
    syncDorms,
  } from "../../lib/local/data/sync";
  import { getDB, initPGLiteDB } from "../../lib/local/data/pgliteDB";

  type MetadataProps = {
    initialSearch?: InitialSearchState;
    suppressLandingModal?: boolean;
  };
  const metadata: MetadataProps = $props();

  let buildings: BuildingData[] | null = $state.raw(null);
  let colleges: CollegeData[] | null = $state.raw(null);
  let directionCount: number | null = $state.raw(null);
  let divisions: DivisionData[] | null = $state.raw(null);
  let dorms: DormData[] | null = $state.raw(null);
  let totalRooms: number | null = $state.raw(null);
  let loaded: boolean = $state(false);
  const appData: AppContextData = $derived({
    buildings,
    colleges,
    directionCount,
    divisions,
    dorms,
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
    const localDB = getDB();
    const buildingCheck = await localTableSyncCheck("buildings");
    const collegeCheck = await localTableSyncCheck("colleges");
    const divisionCheck = await localTableSyncCheck("divisions");
    const dormCheck = await localTableSyncCheck("dorms");
    Promise.resolve()
      .then(() => initPGLiteDB(localDB))
      .catch((e) => console.error(e))
      .then(async () => {
        data = {
          buildings: await getBuildings(buildingCheck),
          colleges: await getColleges(collegeCheck),
          divisions: await getDivisions(divisionCheck),
          dorms: await getDorms(dormCheck),
          ...(await getRoomsData()),
        };
      })
      .then(() => {
          buildings = data.buildings;
          colleges = data.colleges;
          directionCount = data.directionCount;
          divisions = data.divisions;
          dorms = data.dorms;
          totalRooms = data.totalRooms;
          loaded = true;
          Promise.resolve()
            .then(() => syncBuildings(buildingCheck, data.buildings ?? []))
            .then(() => syncColleges(collegeCheck, data.colleges ?? []))
            .then(() => syncDivisions(divisionCheck, data.divisions ?? []))
            .then(() => syncDorms(dormCheck, data.dorms ?? []))
            .then(() => syncToastStore.endSync())
      });
  });

  // svelte-ignore state_referenced_locally
  setAppData(() => appData);

  $inspect(syncToastStore.currentSync, syncToastStore.currentSyncData);
</script>

<Entry
  initialSearch={metadata.initialSearch}
  suppressLandingModal={metadata.suppressLandingModal ?? false}
/>
