import { fireEvent, render, screen } from "@testing-library/svelte";
import { beforeEach, describe, expect, test, vi } from "vitest";
import ChangelogModal from "./ChangelogModal.svelte";
import { syncToastStore } from "@lib/store.svelte";

describe("ChangelogModal", () => {
  beforeEach(() => {
    syncToastStore.needRefresh = false;
  });

  test("without a pending update: shows the full changelog inline and Close, no reload", () => {
    syncToastStore.needRefresh = false;
    render(ChangelogModal);
    expect(screen.getByRole("button", { name: /close/i })).toBeVisible();
    // The changelog itself renders in the modal — no second click needed (#5).
    const versions = screen.getAllByRole("heading", { level: 3 });
    expect(versions.length).toBeGreaterThan(1);
    expect(versions[0]?.textContent).toMatch(/^v\d+\.\d+\.\d+/);
    expect(
      screen.queryByRole("button", { name: /reload to update/i }),
    ).toBeNull();
  });

  test("with a pending update: confirming reload calls syncToastStore.reload", async () => {
    syncToastStore.needRefresh = true;
    const reloadSpy = vi
      .spyOn(syncToastStore, "reload")
      .mockImplementation(() => {});
    render(ChangelogModal);

    const reloadBtn = screen.getByRole("button", { name: /reload to update/i });
    expect(reloadBtn).toBeVisible();
    // Reload must be an explicit confirm, not automatic on open.
    expect(reloadSpy).not.toHaveBeenCalled();

    await fireEvent.click(reloadBtn);
    expect(reloadSpy).toHaveBeenCalledTimes(1);
    reloadSpy.mockRestore();
  });
});
