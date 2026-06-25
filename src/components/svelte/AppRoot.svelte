<script lang="ts">
  import type { InitialSearchState } from "../../lib/app-data";
  import {
    type AppContextData,
    type DBData,
    setAppActions,
    setAppData,
  } from "../../lib/context";
  import { queryStore, syncToastStore } from "../../lib/store.svelte";
  import type {
    BuildingData,
    CollegeData,
    DivisionData,
    DormData,
    EventData,
  } from "../../lib/types";
  import Entry from "./Entry.svelte";
  import { onMount } from "svelte";
  import {
    getBuildings,
    getColleges,
    getDivisions,
    getDorms,
    getEvents,
    getRoomsData,
  } from "../../lib/local/data/utils";
  import {
    localTableSyncCheck,
    syncBuildings,
    syncColleges,
    syncDivisions,
    syncDorms,
    syncEvents,
    syncAliasCache,
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
  let events: EventData[] | null = $state.raw(null);
  let totalRooms: number | null = $state.raw(null);
  let loaded: boolean = $state(false);
  const appData: AppContextData = $derived({
    buildings,
    colleges,
    directionCount,
    divisions,
    dorms,
    events,
    totalRooms,
    loaded,
  });

  queryStore.hydrateQuery(
    metadata.initialSearch
      ? {
          category: metadata.initialSearch.category,
          type: "result",
          value: metadata.initialSearch.value,
          eventSlug: metadata.initialSearch.eventSlug,
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
    const eventCheck = await localTableSyncCheck("events");
    Promise.resolve()
      .then(() => initPGLiteDB(localDB))
      .catch((e) => console.error(e))
      .then(async () => {
        data = {
          buildings: await getBuildings(buildingCheck),
          colleges: await getColleges(collegeCheck),
          divisions: await getDivisions(divisionCheck),
          dorms: await getDorms(dormCheck),
          events: await getEvents(eventCheck),
          ...(await getRoomsData()),
        };
        await syncBuildings(buildingCheck, data.buildings ?? []);
        await syncAliasCache();
      })
      .then(() => {
        buildings = data.buildings;
        colleges = data.colleges;
        directionCount = data.directionCount;
        divisions = data.divisions;
        dorms = data.dorms;
        events = data.events;
        totalRooms = data.totalRooms;
        loaded = true;
        Promise.resolve()
          .then(() => syncColleges(collegeCheck, data.colleges ?? []))
          .then(() => syncDivisions(divisionCheck, data.divisions ?? []))
          .then(() => syncDorms(dormCheck, data.dorms ?? []))
          .then(() => syncEvents(eventCheck, data.events ?? []))
          .then(() => syncToastStore.endSync());
      });
  });

  setAppData(() => appData);
  setAppActions({
    replaceEvent: (updated) => {
      if (!events) return;
      const index = events.findIndex((event) => event.id === updated.id);
      if (index === -1) {
        events = [updated, ...events];
        return;
      }
      const next = events.slice();
      next[index] = updated;
      events = next;
    },
    removeEvent: (eventId) => {
      if (!events) return;
      events = events.filter((event) => event.id !== eventId);
    },
    replaceBuilding: (updated) => {
      if (!buildings) return;
      const index = buildings.findIndex(
        (building) => building.id === updated.id,
      );
      if (index === -1) return;
      const next = buildings.slice();
      next[index] = updated;
      buildings = next;
    },
    replaceDorm: (updated) => {
      if (!dorms) return;
      const index = dorms.findIndex((dorm) => dorm.id === updated.id);
      if (index === -1) return;
      const next = dorms.slice();
      next[index] = updated;
      dorms = next;
    },
    replaceCollege: (updated) => {
      if (!colleges) return;
      const index = colleges.findIndex((college) => college.id === updated.id);
      if (index === -1) return;
      const next = colleges.slice();
      next[index] = updated;
      colleges = next;
    },
    replaceDivision: (updated) => {
      if (!divisions) return;
      const index = divisions.findIndex(
        (division) => division.id === updated.id,
      );
      if (index === -1) return;
      const next = divisions.slice();
      next[index] = updated;
      divisions = next;
    },
  });
</script>

<Entry
  initialSearch={metadata.initialSearch}
  suppressLandingModal={metadata.suppressLandingModal ?? false}
/>
