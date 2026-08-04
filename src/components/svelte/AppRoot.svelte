<script lang="ts">
  import { campusCommunity } from "../../campus.config";
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
    toastStore,
    transitStore,
  } from "@lib/store.svelte";
  import type {
    BuildingData,
    CollegeData,
    DivisionData,
    DormData,
    OrgData,
    PlaceData,
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
    getOrganizations,
    getEvents,
    getClasses,
    getPlaces,
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
    syncOrganizations,
    syncPlaces,
    syncEvents,
    syncAliasCache,
    syncClasses,
    getSyncKeysFromLs,
  } from "@lib/local/data/sync";
  import { getDB } from "@lib/local/data/pgliteDB";
  import { CAMPUS_DATA_REFRESH_EVENT } from "@lib/local/data/invalidate-sync-key";

  type MetadataProps = {
    initialSearch?: InitialSearchState;
    suppressLandingModal?: boolean;
    openToday?: boolean;
    openPlanner?: boolean;
    openFinals?: boolean;
    openCalendar?: boolean;
  };
  const metadata: MetadataProps = $props();

  let buildings: BuildingData[] | null = $state.raw(null);
  let colleges: CollegeData[] | null = $state.raw(null);
  let directionCount: number | null = $state.raw(null);
  let divisions: DivisionData[] | null = $state.raw(null);
  let dorms: DormData[] | null = $state.raw(null);
  let organizations: OrgData[] | null = $state.raw(null);
  let events: EventData[] | null = $state.raw(null);
  let places: PlaceData[] | null = $state.raw(null);
  let totalRooms: number | null = $state.raw(null);
  let loaded: boolean = $state(false);
  const appData: AppContextData = $derived({
    buildings,
    colleges,
    directionCount,
    divisions,
    dorms,
    events,
    organizations,
    places,
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
    dorms = data.dorms.map(normalizeDormListFields);
    events = data.events;
    organizations = data.organizations;
    places = data.places;
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

  function handleRenderError(error: unknown) {
    // Logged, not swallowed: this is the blank-screen path, so we want it in
    // the console and in RUM even though the boundary now renders a fallback.
    console.error("App render failed", error);
    // The shell may still be up if the crash happened before bootstrap
    // finished, and it would cover the fallback with a stuck spinner.
    dismissStaticLoadingShell();
  }

  const EMPTY_DB_DATA: DBData = {
    buildings: [],
    colleges: [],
    divisions: [],
    dorms: [],
    events: [],
    organizations: [],
    places: [],
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

  /** Set once network rows are on screen, so a late cache read can't undo them. */
  let networkDataApplied = false;

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
        organizationCheck,
        placeCheck,
      ] = await Promise.all([
        localTableSyncCheck("buildings"),
        localTableSyncCheck("colleges"),
        localTableSyncCheck("divisions"),
        localTableSyncCheck("dorms"),
        localTableSyncCheck("events"),
        localTableSyncCheck("classes"),
        localTableSyncCheck("organizations"),
        localTableSyncCheck("places"),
      ]);

      syncToastStore.beginFetchingCampus(8);

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
        organizationLoad,
        placeLoad,
        roomsData,
      ] = await Promise.all([
        trackFetch(getBuildings(buildingCheck)),
        trackFetch(getColleges(collegeCheck)),
        trackFetch(getDivisions(divisionCheck)),
        trackFetch(getDorms(dormCheck)),
        trackFetch(getEvents(eventCheck)),
        trackFetch(getClasses(classCheck)),
        trackFetch(getOrganizations(organizationCheck)),
        trackFetch(getPlaces(placeCheck)),
        trackFetch(getRoomsData()),
      ]);

      const nextData = {
        buildings: buildingLoad.rows,
        colleges: collegeLoad.rows,
        divisions: divisionLoad.rows,
        dorms: dormLoad.rows,
        events: eventLoad.rows,
        organizations: organizationLoad.rows,
        places: placeLoad.rows,
        directionCount: roomsData.directionCount,
        totalRooms: roomsData.totalRooms,
      };
      applyData(nextData);
      networkDataApplied = true;

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
      await syncOrganizations(
        organizationCheck,
        organizationLoad.rows,
        organizationLoad.source === "remote",
      );
      await syncPlaces(
        placeCheck,
        placeLoad.rows,
        placeLoad.source === "remote",
      );
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
          "Could not sync campus data.",
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
    appBootstrapStore.setRetryHandler(() => {
      void refreshFromNetwork(false);
    });

    const onOffline = () => {
      toastStore.show("You are offline. Campus data may be stale.", "info");
    };
    const onOnline = () => {
      toastStore.show("Back online. Syncing latest data...", "success");
      void refreshFromNetwork(appBootstrapStore.hasCachedData);
    };
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    const onCampusRefresh = () => {
      void refreshFromNetwork(appBootstrapStore.hasCachedData);
      void transitStore.refresh();
    };
    window.addEventListener(CAMPUS_DATA_REFRESH_EVENT, onCampusRefresh);

    void (async () => {
      try {
        syncToastStore.startRemoteFetch();

        // #866: PGlite is ~5 MB of wasm + data. Awaiting it here put a full
        // Postgres download in front of the first campus fetch, for every
        // visitor — including first-timers whose cache is guaranteed empty.
        // Start hydrating in the background and let the cached read race the
        // network instead of gating it.
        void getDB().then(
          () => void transitStore.refresh(),
          (error: unknown) => console.error(error),
        );

        // localStorage outlives no PGlite download, so it answers "has this
        // browser synced before?" for free — the network refresh still gets
        // the offline/stale-cache semantics it had when the cache read came
        // first.
        const hasSyncedBefore = Object.values(
          getSyncKeysFromLs() ?? {},
        ).some(Boolean);

        void loadCachedAppData().then((cached) => {
          if (!hasUsableCampusData(cached)) return;
          appBootstrapStore.setHasCachedData(true);
          // The network may have painted fresher rows while the cache was
          // still hydrating; never regress the UI back to the cached copy.
          if (networkDataApplied) return;
          applyData(cached);
          appBootstrapStore.complete();
          dismissStaticLoadingShell();
        }, console.error);

        await refreshFromNetwork(hasSyncedBefore);
        dismissStaticLoadingShell();
      } catch (error) {
        console.error("Bootstrap failed", error);
        dismissStaticLoadingShell();
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

    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
      window.removeEventListener(CAMPUS_DATA_REFRESH_EVENT, onCampusRefresh);
    };
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
    upsertBuilding: (updated) => {
      if (!buildings) return;
      const index = buildings.findIndex(
        (building) => building.id === updated.id,
      );
      if (index === -1) {
        buildings = [...buildings, updated].sort((a, b) =>
          a.buildingName.localeCompare(b.buildingName),
        );
        return;
      }
      const next = buildings.slice();
      next[index] = updated;
      buildings = next;
    },
    upsertDorm: (updated) => {
      if (!dorms) return;
      const index = dorms.findIndex((dorm) => dorm.id === updated.id);
      if (index === -1) {
        dorms = [...dorms, normalizeDormListFields(updated)].sort((a, b) =>
          a.dormName.localeCompare(b.dormName),
        );
        return;
      }
      const next = dorms.slice();
      next[index] = normalizeDormListFields(updated);
      dorms = next;
    },
    upsertOrganization: (updated) => {
      if (!organizations) return;
      const index = organizations.findIndex((o) => o.id === updated.id);
      if (index === -1) {
        organizations = [...organizations, updated].sort((a, b) =>
          a.name.localeCompare(b.name),
        );
        return;
      }
      const next = organizations.slice();
      next[index] = updated;
      organizations = next;
    },
    upsertPlace: (updated) => {
      if (!places) return;
      const index = places.findIndex((place) => place.id === updated.id);
      if (index === -1) {
        places = [...places, updated].sort((a, b) =>
          a.name.localeCompare(b.name),
        );
        return;
      }
      const next = places.slice();
      next[index] = updated;
      places = next;
    },
    upsertCollege: (updated) => {
      if (!colleges) return;
      const index = colleges.findIndex((college) => college.id === updated.id);
      if (index === -1) {
        colleges = [...colleges, updated].sort((a, b) =>
          a.collegeName.localeCompare(b.collegeName),
        );
        return;
      }
      const next = colleges.slice();
      next[index] = updated;
      colleges = next;
    },
    upsertDivision: (updated) => {
      if (!divisions) return;
      const index = divisions.findIndex(
        (division) => division.id === updated.id,
      );
      if (index === -1) {
        divisions = [...divisions, updated].sort((a, b) =>
          a.divisionName.localeCompare(b.divisionName),
        );
        return;
      }
      const next = divisions.slice();
      next[index] = updated;
      divisions = next;
    },
  });
</script>

<!-- The bootstrap try/catch only covers data loading. An error thrown while
     rendering happens after the loading shell is already dismissed, which
     unmounts the tree and leaves blank white with no explanation. -->
<svelte:boundary onerror={handleRenderError}>
  <Entry
    initialSearch={metadata.initialSearch}
    suppressLandingModal={metadata.suppressLandingModal ?? false}
    openToday={metadata.openToday ?? false}
    openPlanner={metadata.openPlanner ?? false}
    openFinals={metadata.openFinals ?? false}
    openCalendar={metadata.openCalendar ?? false}
  />

  {#snippet failed(error, reset)}
    <div class="app-crash" role="alert">
      <div class="app-crash__card">
        <p class="app-crash__title">Something broke while drawing the map</p>
        <p class="app-crash__body">
          Your saved campus data is still on this device. Try again, and if it
          keeps happening please report it so we can fix the cause.
        </p>
        <div class="app-crash__actions">
          <button
            type="button"
            class="app-crash__button app-crash__button--primary"
            onclick={reset}
          >
            Try again
          </button>
          <button
            type="button"
            class="app-crash__button"
            onclick={() => location.reload()}
          >
            Reload page
          </button>
          <a
      class="app-crash__button"
      href={`${campusCommunity.githubUrl}/issues/new`}
      target="_blank"
      rel="noopener noreferrer"
    >
            Report
          </a>
        </div>
        <p class="app-crash__detail">{String(error)}</p>
      </div>
    </div>
  {/snippet}
</svelte:boundary>

<style>
  .app-crash {
    position: fixed;
    inset: 0;
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 1.5rem;
    background: hsl(5, 22%, 96%);
  }

  .app-crash__card {
    max-width: 26rem;
    text-align: center;
  }

  .app-crash__title {
    margin: 0;
    color: hsl(5, 12%, 16%);
    font-size: 1.0625rem;
    font-weight: 700;
  }

  .app-crash__body {
    margin: 0.5rem 0 0;
    color: hsl(5, 12%, 42%);
    font-size: 0.875rem;
    line-height: 1.5;
  }

  .app-crash__actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    justify-content: center;
    margin-top: 1.25rem;
  }

  .app-crash__button {
    padding: 0.6rem 1rem;
    border: 1px solid hsl(5, 28%, 78%);
    border-radius: 0.625rem;
    background: hsl(0, 0%, 100%);
    color: hsl(5, 12%, 16%);
    font: inherit;
    font-size: 0.875rem;
    font-weight: 600;
    text-decoration: none;
    cursor: pointer;
  }

  .app-crash__button--primary {
    border-color: transparent;
    background: hsl(5, 53%, 32%);
    color: hsl(0, 0%, 100%);
  }

  .app-crash__detail {
    margin: 1rem 0 0;
    color: hsl(5, 12%, 52%);
    font-size: 0.75rem;
    word-break: break-word;
  }
</style>
