import { vi } from "vitest";

vi.mock("../local/data/campus-directory-sync.js", () => ({
  OFFLINE_DIRECTORY_SYNCED_AT_KEY: "room-tba-offline-directory-synced-at",
  syncCampusDirectoryForOffline: vi.fn(async () => ({ ok: true as const })),
}));

vi.mock("../local/data/class-schedules-offline-sync.js", () => ({
  OFFLINE_CLASSES_SYNCED_AT_KEY: "room-tba-offline-classes-synced-at",
  syncClassSchedulesForOffline: vi.fn(async () => ({
    ok: true as const,
    rowCount: 0,
  })),
}));

import { describe, expect, test } from "vitest";
import { AppBootstrapStore, SyncToastStore } from "./sync-stores.svelte";

describe("AppBootstrapStore", () => {
  test("phase transitions remote → sync → ready", () => {
    const store = new AppBootstrapStore();
    expect(store.phase).toBe("idle");
    store.beginRemote();
    expect(store.phase).toBe("remote");
    expect(store.statusLabel).toContain("Connecting");
    store.beginSync();
    expect(store.phase).toBe("sync");
    store.complete();
    expect(store.phase).toBe("ready");
    expect(store.statusLabel).toBeNull();
  });

  test("fail stores message and retry handler", () => {
    const store = new AppBootstrapStore();
    let retried = false;
    store.fail("Network down", () => {
      retried = true;
    });
    expect(store.phase).toBe("error");
    expect(store.errorMessage).toBe("Network down");
    expect(store.canRetry).toBe(true);
    store.retry();
    expect(retried).toBe(true);
    expect(store.phase).toBe("remote");
  });
});

describe("SyncToastStore", () => {
  test("progressPercent tracks building sync", () => {
    const store = new SyncToastStore();
    store.startBuildingsSync(4);
    store.updateBuildingsSync();
    store.updateBuildingsSync();
    expect(store.progressPercent).toBe(50);
    store.endSync();
    expect(store.allSynced).toBe(true);
  });

  test("setSyncError exposes retry handler", () => {
    const store = new SyncToastStore();
    let retried = false;
    store.setSyncError("Write failed", () => {
      retried = true;
    });
    expect(store.syncError).toBe("Write failed");
    store.retrySync();
    expect(retried).toBe(true);
    expect(store.syncError).toBeNull();
  });
});
