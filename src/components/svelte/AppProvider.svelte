<script lang="ts">
  import type { AppPageData, InitialSearchState } from "../../lib/app-data";
  import { setAppData } from "../../lib/context";
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

  type Props = {
    rooms: RoomData[];
    buildings: BuildingData[];
    colleges: CollegeData[];
    divisions: DivisionData[];
    dorms: DormData[];
    classesMap: Map<string, ClassMapValue[]>;
    totalRooms: number;
    directionCount: number;
  };
  const appData: Props = $props();

  queryStore.hydrateQuery(
    appData.initialSearch
      ? {
          category: appData.initialSearch.category,
          type: "result",
          value: appData.initialSearch.value,
        }
      : {
          category: null,
          type: "query",
          value: "",
        },
  );

  // svelte-ignore state_referenced_locally
  setAppData(appData);
</script>

<Entry
  initialSearch={appData.initialSearch}
  suppressLandingModal={appData.suppressLandingModal ?? false}
/>
