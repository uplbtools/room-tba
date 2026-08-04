import { render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, test, vi } from "vitest";
import SettingsModalHost from "@test/components/SettingsModalHost.svelte";
import {
  expectNoHorizontalOverflow,
  mountAtWidth,
} from "@test/layout-assertions";
import { SYNC_TABLE_NAMES } from "@lib/local/data/sync-keys";
import { syncToastStore } from "@lib/store.svelte";

const clearCachedData = vi.hoisted(() => vi.fn(async () => {}));
vi.mock("@lib/local/clear-cached-data", () => ({ clearCachedData }));

// Only the sync-key module is stubbed, so the real `resyncCampusData()` runs
// and the table list it passes is actually asserted.
const invalidateLocalSyncKeys = vi.hoisted(() => vi.fn());
const requestCampusDataRefresh = vi.hoisted(() => vi.fn());
vi.mock("@lib/local/data/invalidate-sync-key", () => ({
  invalidateLocalSyncKeys,
  requestCampusDataRefresh,
  CAMPUS_DATA_REFRESH_EVENT: "room-tba:campus-data-refresh",
}));

const reload = vi.fn();

const clearButton = () =>
  screen.getByRole("button", { name: "Clear cached data and reload" });

// The row label carries "campus data" now, so the button is just the verb.
const resyncButton = () => screen.getByRole("button", { name: "Resync" });

describe("SettingsModal", () => {
  test("renders every section at 320px without horizontal overflow", () => {
    mountAtWidth(320);
    const { container } = render(SettingsModalHost);

    expect(screen.getByRole("heading", { name: "Settings" })).toBeVisible();
    // Transit moved to the sidebar's Jeepney routes browse panel.
    for (const section of ["View", "Terrain", "Schedule", "Storage"]) {
      expect(
        screen.getByRole("heading", { name: section }),
      ).toBeInTheDocument();
    }
    expectNoHorizontalOverflow(container);
  });
});

describe("SettingsModal storage section (#865)", () => {
  beforeEach(() => {
    clearCachedData.mockReset();
    clearCachedData.mockImplementation(async () => {});
    reload.mockClear();
    vi.spyOn(window.location, "reload").mockImplementation(reload);
  });

  test("promises the user's plans survive", () => {
    render(SettingsModalHost);

    expect(screen.getByText(/Your saved class plans stay/)).toBeInTheDocument();
    expect(clearButton()).toBeInTheDocument();
  });

  test("the first click only asks; it clears nothing", async () => {
    render(SettingsModalHost);

    clearButton().click();
    await Promise.resolve();

    expect(clearCachedData).not.toHaveBeenCalled();
    expect(
      screen.getByText(/Downloaded offline maps go too/),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Clear and reload" }),
    ).toBeInTheDocument();
  });

  test("moves focus to the confirm so keyboard users are not dropped on <body>", async () => {
    render(SettingsModalHost);

    clearButton().click();
    const confirm = await screen.findByRole("button", {
      name: "Clear and reload",
    });
    await vi.waitFor(() => expect(document.activeElement).toBe(confirm));
    expect(confirm.getAttribute("aria-describedby")).toBe(
      "settings-storage-warning",
    );
  });

  test("cancel backs out without clearing", async () => {
    render(SettingsModalHost);

    clearButton().click();
    await Promise.resolve();
    screen.getByRole("button", { name: "Cancel" }).click();
    await Promise.resolve();

    expect(clearCachedData).not.toHaveBeenCalled();
    expect(clearButton()).toBeInTheDocument();
  });

  test("confirming clears and reloads", async () => {
    render(SettingsModalHost);

    clearButton().click();
    await Promise.resolve();
    screen.getByRole("button", { name: "Clear and reload" }).click();

    await vi.waitFor(() => expect(reload).toHaveBeenCalledTimes(1));
    expect(clearCachedData).toHaveBeenCalledTimes(1);
  });

  test("disables the buttons while clearing and ignores a second click", async () => {
    let finish = () => {};
    clearCachedData.mockImplementation(
      () =>
        new Promise<void>((resolve) => {
          finish = resolve;
        }),
    );
    render(SettingsModalHost);

    clearButton().click();
    await Promise.resolve();
    screen.getByRole("button", { name: "Clear and reload" }).click();

    const busy = await screen.findByRole("button", { name: "Clearing…" });
    expect((busy as HTMLButtonElement).disabled).toBe(true);
    expect(
      (screen.getByRole("button", { name: "Cancel" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);

    busy.click();
    expect(clearCachedData).toHaveBeenCalledTimes(1);

    finish();
    await vi.waitFor(() => expect(reload).toHaveBeenCalled());
  });
});

describe("SettingsModal resync campus data", () => {
  beforeEach(() => {
    invalidateLocalSyncKeys.mockClear();
    requestCampusDataRefresh.mockClear();
    // Mid-sync state: `startRemoteFetch()` clears both when a refresh starts.
    syncToastStore.allSynced = false;
    syncToastStore.syncError = null;
  });

  test("invalidates every tracked table, not a subset", async () => {
    render(SettingsModalHost);

    resyncButton().click();
    await Promise.resolve();

    expect(invalidateLocalSyncKeys).toHaveBeenCalledWith([...SYNC_TABLE_NAMES]);
    expect(requestCampusDataRefresh).toHaveBeenCalledTimes(1);
  });

  test("shows a busy state and ignores a second click", async () => {
    render(SettingsModalHost);

    resyncButton().click();

    const busy = await screen.findByRole("button", { name: "Resyncing…" });
    expect((busy as HTMLButtonElement).disabled).toBe(true);

    busy.click();
    expect(requestCampusDataRefresh).toHaveBeenCalledTimes(1);
  });

  test("reports success once the sync store settles", async () => {
    render(SettingsModalHost);

    resyncButton().click();
    await screen.findByRole("button", { name: "Resyncing…" });
    syncToastStore.allSynced = true;

    expect(
      await screen.findByText(
        "Campus data is up to date.",
        {},
        { timeout: 3000 },
      ),
    ).toBeInTheDocument();
    await vi.waitFor(() => expect(resyncButton()).toBeInTheDocument());
  });

  test("surfaces a failure instead of silently doing nothing", async () => {
    render(SettingsModalHost);

    syncToastStore.syncError = "Network request failed";
    resyncButton().click();

    expect(
      await screen.findByText(
        "Resync failed. Check your connection and try again.",
        {},
        { timeout: 3000 },
      ),
    ).toBeInTheDocument();
    // Not left stuck in the busy state.
    await vi.waitFor(() => expect(resyncButton()).toBeInTheDocument());
  });

  test("does not claim success when nothing handled the refresh", async () => {
    render(SettingsModalHost);

    // No listener ran, so `allSynced` still carries the previous sync's true.
    syncToastStore.allSynced = true;
    resyncButton().click();

    expect(
      await screen.findByText(
        "Resync failed. Check your connection and try again.",
        {},
        { timeout: 3000 },
      ),
    ).toBeInTheDocument();
  });

  test("leaves the offline map caches and the clear button alone", () => {
    render(SettingsModalHost);

    expect(
      screen.getByText(/downloaded offline maps are kept/i),
    ).toBeInTheDocument();
    expect(clearButton()).toBeInTheDocument();
  });

  test("keeps the row label and ties the kept-maps promise to the button", () => {
    render(SettingsModalHost);

    expect(screen.getByText("Campus data")).toBeInTheDocument();
    const described = document.getElementById(
      resyncButton().getAttribute("aria-describedby") ?? "",
    );
    expect(described?.textContent?.replace(/\s+/g, " ")).toMatch(
      /downloaded offline maps are kept/i,
    );
  });
});
