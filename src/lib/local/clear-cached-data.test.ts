import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import {
  clearCachedData,
  PGLITE_IDB_NAME,
  PRESERVED_LOCAL_KEYS,
} from "./clear-cached-data";
import { PLANNER_LS_KEY } from "@lib/stores/store-types";

const SYNC_KEYS = JSON.stringify({
  buildings: "b1",
  rooms: "r1",
  classes: "c1",
});

const PLANNER_STATE = JSON.stringify({
  v: 1,
  plans: [{ id: "p1", label: "My plan", termId: 1252, sections: [] }],
  activePlanIdByTerm: { "1252": "p1" },
});

type Harness = {
  unregistered: number;
  cacheKeys: string[];
  deletedCaches: string[];
  deletedDatabases: string[];
};

let harness: Harness;
const originals = new Map<string, PropertyDescriptor | undefined>();

function define(name: string, value: unknown) {
  if (!originals.has(name)) {
    originals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
  }
  Object.defineProperty(globalThis, name, { value, configurable: true });
}

/** Bun has no DOM; stand up only the globals the clear routine touches. */
function setupBrowserGlobals(overrides: { cachesFails?: boolean } = {}) {
  harness = {
    unregistered: 0,
    cacheKeys: ["workbox-precache-v2", "map-tiles", "map-assets"],
    deletedCaches: [],
    deletedDatabases: [],
  };

  const store = new Map<string, string>();
  define("localStorage", {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
    clear: () => store.clear(),
    get length() {
      return store.size;
    },
  });

  const caches = {
    keys: async () => [...harness.cacheKeys],
    delete: async (key: string) => {
      if (overrides.cachesFails) throw new Error("cache storage unavailable");
      harness.deletedCaches.push(key);
      harness.cacheKeys = harness.cacheKeys.filter((k) => k !== key);
      return true;
    },
  };
  define("caches", caches);
  define("window", { caches });

  define("navigator", {
    serviceWorker: {
      getRegistrations: async () => [
        {
          unregister: async () => {
            harness.unregistered += 1;
            return true;
          },
        },
      ],
    },
  });

  define("indexedDB", {
    deleteDatabase: (name: string) => {
      const request: Record<string, unknown> = {};
      queueMicrotask(() => {
        harness.deletedDatabases.push(name);
        (request.onsuccess as (() => void) | undefined)?.();
      });
      return request;
    },
  });

  return store;
}

describe("clearCachedData", () => {
  let store: Map<string, string>;

  beforeEach(() => {
    store = setupBrowserGlobals();
    store.set("sync-key", SYNC_KEYS);
    store.set(PLANNER_LS_KEY, PLANNER_STATE);
    store.set("hideLandingModal", "true");
    store.set("recent-search", '["PSLH 1"]');
    store.set("sidebar-expanded", "false");
  });

  afterEach(() => {
    for (const [name, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else Reflect.deleteProperty(globalThis, name);
    }
    originals.clear();
  });

  it("keeps the user's planner plans — the whole point of not calling localStorage.clear()", async () => {
    await clearCachedData();
    expect(store.get(PLANNER_LS_KEY)).toBe(PLANNER_STATE);
  });

  it("keeps the preference keys", async () => {
    await clearCachedData();
    expect(store.get("hideLandingModal")).toBe("true");
    expect(store.get("recent-search")).toBe('["PSLH 1"]');
    expect(store.get("sidebar-expanded")).toBe("false");
  });

  it("lists the planner key among the preserved keys", () => {
    expect(PRESERVED_LOCAL_KEYS).toContain(PLANNER_LS_KEY);
  });

  it("unregisters service workers", async () => {
    await clearCachedData();
    expect(harness.unregistered).toBe(1);
  });

  it("deletes every cache, including the offline map caches", async () => {
    await clearCachedData();
    expect(harness.deletedCaches).toContain("workbox-precache-v2");
    expect(harness.deletedCaches).toContain("map-tiles");
    expect(harness.deletedCaches).toContain("map-assets");
    expect(harness.cacheKeys).toEqual([]);
  });

  it("drops the PGlite campus cache", async () => {
    await clearCachedData();
    expect(harness.deletedDatabases).toEqual([PGLITE_IDB_NAME]);
  });

  it("empties the sync keys so campus data re-syncs", async () => {
    await clearCachedData();
    expect(JSON.parse(store.get("sync-key") ?? "null")).toEqual({});
  });

  it("finishes the remaining steps when one fails", async () => {
    store = setupBrowserGlobals({ cachesFails: true });
    store.set("sync-key", SYNC_KEYS);
    store.set(PLANNER_LS_KEY, PLANNER_STATE);

    await clearCachedData();

    expect(harness.deletedDatabases).toEqual([PGLITE_IDB_NAME]);
    expect(JSON.parse(store.get("sync-key") ?? "null")).toEqual({});
    expect(store.get(PLANNER_LS_KEY)).toBe(PLANNER_STATE);
  });
});
