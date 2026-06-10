<script lang="ts">
  import { isBrowser } from "es-toolkit";
  import type { InitialSearchState } from "../../lib/app-data";
  import { AppContextData, DBData, setAppData } from "../../lib/context";
  import { queryStore } from "../../lib/store.svelte";
  import {
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
    fetchAppData,
    getLocalAppData,
    isLocalDataValid,
    syncAppData,
  } from "../../lib/local/data/sync";

  type MetadataProps = {
    initialSearch?: InitialSearchState;
    suppressLandingModal?: boolean;
  };
  const metadata: MetadataProps = $props();

  let buildings: BuildingData[] | null = $state.raw(null);
  let colleges: CollegeData[] | null = $state.raw(null);
  let classesMap: Map<string, ClassMapValue[]> | null = $state.raw(null);
  let directionCount: number | null = $state.raw(null);
  let divisions: DivisionData[] | null = $state.raw(null);
  let dorms: DormData[] | null = $state.raw(null);
  let rooms: RoomData[] | null = $state.raw(null);
  let totalRooms: number | null = $state.raw(null);
  let loaded: boolean = $state(false);
  const appData: AppContextData = $derived({
    buildings,
    colleges,
    classesMap,
    directionCount,
    divisions,
    dorms,
    rooms,
    totalRooms,
    loaded,
  });

  queryStore.hydrateQuery(
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
    if (!isBrowser()) return;

    let data: DBData;
    if (isLocalDataValid()) {
      data = await getLocalAppData();
    } else {
      data = await fetchAppData();
      await syncAppData(data);
    }

    loadAppData(data);
  });

  function loadAppData(data: DBData) {
    buildings = data.buildings;
    colleges = data.colleges;
    classesMap = data.classesMap;
    directionCount = data.directionCount;
    divisions = data.divisions;
    dorms = data.dorms;
    rooms = data.rooms;
    totalRooms = data.totalRooms;

    loaded = true;
  }
  // svelte-ignore state_referenced_locally
  setAppData(appData);
</script>

<Entry
  initialSearch={metadata.initialSearch}
  suppressLandingModal={metadata.suppressLandingModal ?? false}
/>
