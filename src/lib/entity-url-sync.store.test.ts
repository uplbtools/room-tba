// Vitest, not bun test: this module reaches store.svelte, which needs runes.
import { describe, expect, it } from "vitest";
import type { AppContextData } from "./context";
import {
  createEntityUrlSync,
  type EntityUrlSyncSnapshot,
  isScreenId,
} from "./entity-url-sync";
import type { RoutableQueryState } from "./entity-urls";

// A screen missing here never syncs its path, so the sidebar entry opens it
// while the URL stays on "/" (unshareable, wrong on back/forward).
describe("isScreenId", () => {
  it("recognizes every full-screen route", () => {
    expect(isScreenId("today")).toBe(true);
    expect(isScreenId("planner")).toBe(true);
    expect(isScreenId("finals")).toBe(true);
    expect(isScreenId("calendar")).toBe(true);
  });

  it("rejects sidebar panels that are not screens", () => {
    expect(isScreenId("map")).toBe(false);
    expect(isScreenId("settings")).toBe(false);
  });
});

describe("createEntityUrlSync booted on an entity path without a query", () => {
  // The service worker serves the "/" app shell for /building/… in any tab it
  // controls, so the page boots with no server-hydrated query. Syncing used to
  // push "/" right away: the deep-link bounce home.
  const PATH = "/building/physical-sciences-building/";

  function snapshot(): EntityUrlSyncSnapshot {
    return {
      type: "query",
      category: null,
      value: "",
      room: null,
      editMode: false,
      termId: null,
      defaultTermId: null,
      screen: null,
      transitRouteId: null,
      transitStopIndex: null,
      transitRoute: null,
    };
  }

  function setup() {
    window.history.replaceState(null, "", PATH);
    const hydrated: RoutableQueryState[] = [];
    const notFound: string[] = [];
    const data = { buildings: [] as { buildingName: string }[] };
    const sync = createEntityUrlSync({
      getAppData: () =>
        ({
          buildings: data.buildings,
          colleges: [],
          divisions: [],
          dorms: [],
          organizations: [],
          places: [],
          events: [],
        }) as unknown as AppContextData,
      hydrateQuery: (query) => {
        hydrated.push(query);
      },
      clearQuery: () => {},
      getQuerySnapshot: () => ({ type: "query", category: null, value: "" }),
      setScreen: () => {},
      setTransit: () => {},
      onNotFound: () => {
        notFound.push(window.location.pathname);
      },
    });
    return { sync, hydrated, data, notFound };
  }

  it("keeps the path while campus data loads, then opens the entity", async () => {
    const { sync, hydrated, data } = setup();
    sync.init();
    sync.syncFromQuery(snapshot());
    expect(window.location.pathname).toBe(PATH);

    data.buildings = [{ buildingName: "Physical Sciences Building" }];
    await sync.resolvePendingPath(true);
    expect(hydrated).toEqual([
      {
        type: "result",
        category: "building",
        value: "Physical Sciences Building",
      },
    ]);
    sync.destroy();
  });

  it("goes home once data is in and the path still names nothing", async () => {
    const { sync, hydrated, notFound } = setup();
    sync.init();
    await sync.resolvePendingPath(true);
    sync.syncFromQuery(snapshot());
    expect(hydrated).toEqual([]);
    expect(notFound).toEqual([PATH]);
    expect(window.location.pathname).toBe("/");
    sync.destroy();
  });
});
