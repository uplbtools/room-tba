import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { resyncCampusData, type SyncStatus } from "./resync-campus-data";
import { SYNC_TABLE_NAMES } from "./data/sync-keys";

const originals = new Map<string, PropertyDescriptor | undefined>();

function define(name: string, value: unknown) {
  if (!originals.has(name)) {
    originals.set(name, Object.getOwnPropertyDescriptor(globalThis, name));
  }
  Object.defineProperty(globalThis, name, { value, configurable: true });
}

/** Sync keys start populated so the invalidation has something to strip. */
function seedSyncKeys(store: Map<string, string>) {
  store.set(
    "sync-key",
    JSON.stringify(
      Object.fromEntries(SYNC_TABLE_NAMES.map((table) => [table, "stale"])),
    ),
  );
}

let dispatched: string[];

function setup() {
  const store = new Map<string, string>();
  define("localStorage", {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => store.set(key, value),
    removeItem: (key: string) => store.delete(key),
  });
  dispatched = [];
  define("window", {
    dispatchEvent: (event: Event) => {
      dispatched.push(event.type);
      return true;
    },
  });
  seedSyncKeys(store);
  return store;
}

/** Status that flips to a terminal state after `afterCalls` reads. */
function statusAfter(afterCalls: number, terminal: SyncStatus) {
  let calls = 0;
  return () => {
    calls += 1;
    return calls > afterCalls
      ? terminal
      : { allSynced: false, syncError: null };
  };
}

describe("resyncCampusData", () => {
  let store: Map<string, string>;

  beforeEach(() => {
    store = setup();
  });

  afterEach(() => {
    for (const [name, descriptor] of originals) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else Reflect.deleteProperty(globalThis, name);
    }
    originals.clear();
  });

  it("invalidates every sync key, not a subset", async () => {
    await resyncCampusData(
      statusAfter(1, { allSynced: true, syncError: null }),
    );

    expect(JSON.parse(store.get("sync-key") ?? "null")).toEqual({});
  });

  it("asks the app to refetch", async () => {
    await resyncCampusData(
      statusAfter(1, { allSynced: true, syncError: null }),
    );

    expect(dispatched).toEqual(["room-tba:campus-data-refresh"]);
  });

  it("reports success once the sync store settles", async () => {
    const outcome = await resyncCampusData(
      statusAfter(1, { allSynced: true, syncError: null }),
      { pollMs: 1 },
    );

    expect(outcome).toBe("synced");
  });

  it("reports a failure when the sync errors", async () => {
    const outcome = await resyncCampusData(
      statusAfter(2, { allSynced: false, syncError: "Network request failed" }),
      { pollMs: 1 },
    );

    expect(outcome).toBe("failed");
  });

  it("fails fast when nothing handled the refresh request", async () => {
    // `startRemoteFetch()` would have cleared `allSynced` synchronously, so a
    // still-true flag means no listener ran — a silent no-op otherwise.
    const outcome = await resyncCampusData(() => ({
      allSynced: true,
      syncError: null,
    }));

    expect(outcome).toBe("failed");
  });

  it("times out instead of hanging in a busy state forever", async () => {
    const outcome = await resyncCampusData(
      () => ({ allSynced: false, syncError: null }),
      { pollMs: 1, timeoutMs: 20 },
    );

    expect(outcome).toBe("timeout");
  });

  it("covers every table the sync keys track", () => {
    expect([...SYNC_TABLE_NAMES]).toEqual(
      expect.arrayContaining([
        "buildings",
        "colleges",
        "divisions",
        "rooms",
        "dorms",
        "classes",
        "final_exams",
        "events",
        "organizations",
        "places",
        "announcements",
      ]),
    );
  });
});
