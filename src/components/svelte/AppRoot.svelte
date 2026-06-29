<script lang="ts">
  import type { InitialSearchState } from "@lib/app-data";
  import {
    type AppContextData,
    type DBData,
    setAppActions,
    setAppData,
  } from "@lib/context";
  import {
    queryStore,
    syncToastStore,
    appBootstrapStore,
  } from "@lib/store.svelte";
  import type {
    BuildingData,
    CollegeData,
    DivisionData,
    DormData,
    EventData,
    TableSyncInfo,
  } from "@lib/types";
  import Entry from "./Entry.svelte";
  import { onMount } from "svelte";
  import { jitteredBackoffDelay, sleep } from "@lib/local/data/fetch-json";
  import {
    fetchRemoteEvents,
    getBuildings,
    getColleges,
    getDivisions,
    getDorms,
    getEvents,
    getClasses,
    getRoomsData,
    loadCachedAppData,
  } from "@lib/local/data/utils";
  import { normalizeDormListFields } from "@lib/string-lists";
  import {
    localTableSyncCheck,
    syncBuildings,
    syncColleges,
    syncDivisions,
    syncDorms,
    syncEvents,
    syncAliasCache,
    syncClasses,
  } from "@lib/local/data/sync";
  import { getDB, initPGLiteDB } from "@lib/local/data/pgliteDB";

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

  function applyData(data: DBData) {
    buildings = data.buildings;
    colleges = data.colleges;
    directionCount = data.directionCount;
    divisions = data.divisions;
    dorms = data.dorms;
    events = data.events;
    totalRooms = data.totalRooms;
  }

  function hasUsableCampusData(data: DBData) {
    return (
      data.buildings.length > 0 ||
      data.colleges.length > 0 ||
      data.divisions.length > 0 ||
      data.dorms.length > 0 ||
      data.events.length > 0 ||
      data.totalRooms > 0
    );
  }

  function dismissStaticLoadingShell() {
    document.getElementById("app-loading-shell")?.remove();
  }

  const EMPTY_DB_DATA: DBData = {
    buildings: [],
    colleges: [],
    divisions: [],
    dorms: [],
    events: [],
    directionCount: 0,
    totalRooms: 0,
  };

  async function retryStaleEventsInBackground(eventCheck: TableSyncInfo) {
    if (eventCheck.valid || eventCheck.newKey === null) return;

    const maxWaves = 5;
    for (let wave = 0; wave < maxWaves; wave += 1) {
      try {
        const fresh = await fetchRemoteEvents();
        events = fresh;
        await syncEvents(eventCheck, fresh, true);
        return;
      } catch (error) {
        console.error("Background events fetch failed", error);
        if (wave >= maxWaves - 1) return;
        await sleep(jitteredBackoffDelay(wave + 1, 2_000, 60_000));
      }
    }
  }

  async function refreshFromNetwork(hasCachedDataAtStart: boolean) {
    if (hasCachedDataAtStart) {
      appBootstrapStore.markBackgroundRefresh();
    } else if (appBootstrapStore.phase !== "remote") {
      appBootstrapStore.beginRemote();
    }
    syncToastStore.startRemoteFetch();

    let didSync = false;
    try {
      const [
        buildingCheck,
        collegeCheck,
        divisionCheck,
        dormCheck,
        eventCheck,
        classCheck,
      ] = await Promise.all([
        localTableSyncCheck("buildings"),
        localTableSyncCheck("colleges"),
        localTableSyncCheck("divisions"),
        localTableSyncCheck("dorms"),
        localTableSyncCheck("events"),
        localTableSyncCheck("classes"),
      ]);

      syncToastStore.beginFetchingCampus(7);

      const trackFetch = <T,>(promise: Promise<T>) =>
        promise.finally(() => {
          syncToastStore.reportFetchComplete();
        });

      const [
        buildingLoad,
        collegeLoad,
        divisionLoad,
        dormLoad,
        eventLoad,
        classLoad,
        roomsData,
      ] = await Promise.all([
        trackFetch(getBuildings(buildingCheck)),
        trackFetch(getColleges(collegeCheck)),
        trackFetch(getDivisions(divisionCheck)),
        trackFetch(getDorms(dormCheck)),
        trackFetch(getEvents(eventCheck)),
        trackFetch(getClasses(classCheck)),
        trackFetch(getRoomsData()),
      ]);

      const nextData = {
        buildings: buildingLoad.rows,
        colleges: collegeLoad.rows,
        divisions: divisionLoad.rows,
        dorms: dormLoad.rows,
        events: eventLoad.rows,
        directionCount: roomsData.directionCount,
        totalRooms: roomsData.totalRooms,
      };
      applyData(nextData);

      const hasData = hasUsableCampusData(nextData);
      if (hasData) {
        appBootstrapStore.setHasCachedData(true);
      } else if (!hasCachedDataAtStart) {
        appBootstrapStore.setHasCachedData(false);
      }
      if (!hasData) {
        if (hasCachedDataAtStart) {
          appBootstrapStore.complete();
        } else {
          appBootstrapStore.fail(
            "Could not load campus data. Check your connection and try again.",
            () => {
              void refreshFromNetwork(false);
            },
          );
        }
        return;
      }

      appBootstrapStore.beginSync();
      didSync = true;

      await syncBuildings(
        buildingCheck,
        buildingLoad.rows,
        buildingLoad.source === "remote",
      );
      await syncAliasCache();
      await syncColleges(
        collegeCheck,
        collegeLoad.rows,
        collegeLoad.source === "remote",
      );
      await syncDivisions(
        divisionCheck,
        divisionLoad.rows,
        divisionLoad.source === "remote",
      );
      await syncDorms(dormCheck, dormLoad.rows, dormLoad.source === "remote");
      await syncEvents(
        eventCheck,
        eventLoad.rows,
        eventLoad.source === "remote",
      );
      await syncClasses(
        classCheck,
        classLoad.rows,
        classLoad.source === "remote",
      );

      if (
        eventLoad.source === "cache" &&
        !eventCheck.valid &&
        eventCheck.newKey !== null
      ) {
        void retryStaleEventsInBackground(eventCheck);
      }

      appBootstrapStore.complete();
    } catch (error) {
      console.error("Network refresh failed", error);
      const hasUsableData = hasUsableCampusData({
        buildings: buildings ?? [],
        colleges: colleges ?? [],
        divisions: divisions ?? [],
        dorms: dorms ?? [],
        events: events ?? [],
        directionCount: directionCount ?? 0,
        totalRooms: totalRooms ?? 0,
      });
      if (!hasCachedDataAtStart && !hasUsableData) {
        appBootstrapStore.fail(
          "Could not connect to the database. Check your connection and try again.",
          () => {
            void refreshFromNetwork(false);
          },
        );
      } else if (hasUsableData) {
        syncToastStore.setSyncError(
          "Could not sync campus data. Tap to retry.",
          () => {
            void refreshFromNetwork(hasCachedDataAtStart);
          },
        );
        appBootstrapStore.complete();
      } else {
        appBootstrapStore.complete();
      }
    } finally {
      syncToastStore.endSync(didSync);
    }
  }

  onMount(() => {
    applyData(EMPTY_DB_DATA);
    loaded = true;
    dismissStaticLoadingShell();
    appBootstrapStore.complete();
    appBootstrapStore.setRetryHandler(() => {
      void refreshFromNetwork(false);
    });

    void (async () => {
      try {
        syncToastStore.startRemoteFetch();
        const localDB = getDB();
        try {
          await initPGLiteDB(localDB);
        } catch (error) {
          console.error(error);
        }

        const cached = await loadCachedAppData();
        const hasCache = hasUsableCampusData(cached);
        appBootstrapStore.setHasCachedData(hasCache);
        if (hasCache) {
          applyData(cached);
        }

        await refreshFromNetwork(hasCache);
      } catch (error) {
        console.error("Bootstrap failed", error);
        if (appBootstrapStore.hasCachedData) {
          appBootstrapStore.complete();
        } else {
          appBootstrapStore.fail(
            "Could not load campus data. Check your connection and try again.",
            () => {
              void refreshFromNetwork(false);
            },
          );
        }
      }
    })();
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
      next[index] = normalizeDormListFields(updated);
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
