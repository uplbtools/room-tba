import { render, screen } from "@testing-library/svelte";
import { tick } from "svelte";
import { afterEach, describe, expect, test, vi } from "vitest";
import type { SponsorsData } from "@lib/sponsors";
import { expectSingleLineButton, mountAtWidth } from "@test/layout-assertions";

const loadSponsorsMock = vi.hoisted(() =>
  vi.fn<() => Promise<SponsorsData | null>>(async () => null),
);
vi.mock("@lib/sponsors", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@lib/sponsors")>()),
  loadSponsors: loadSponsorsMock,
}));

import StatusBar from "@ui/StatusBar.svelte";
import { syncToastStore } from "@lib/store.svelte";

afterEach(() => {
  syncToastStore.clearSyncError();
});

async function renderInSyncError(retry: () => void = () => {}) {
  syncToastStore.setSyncError("Could not sync campus data.", retry);
  const rendered = render(StatusBar);
  await tick();
  return rendered;
}

describe("StatusBar in the sync-error state", () => {
  test("shows exactly one retry affordance", async () => {
    await renderInSyncError();

    // Regression: the status bar used to render SyncStatus's Retry button *and*
    // its own ladder pill, so two retry controls sat side by side.
    expect(screen.queryAllByRole("button", { name: /retry/i })).toHaveLength(1);
  });

  test("states the problem without telling the user to tap to retry", async () => {
    const { container } = await renderInSyncError();

    expect(screen.getByText("Could not sync campus data.")).toBeVisible();
    expect(container.textContent).not.toMatch(/tap to retry/i);
  });

  test("the surviving retry button still runs the retry action", async () => {
    const retry = vi.fn();
    await renderInSyncError(retry);

    screen.getByRole("button", { name: /retry/i }).click();
    await tick();

    expect(retry).toHaveBeenCalledTimes(1);
  });

  // The bottom chrome used to clip its trailing controls at narrow widths, so
  // this Retry button could render off-screen. The geometry proof lives in
  // e2e/browse/bottom-chrome-overflow.spec.ts (happy-dom has no layout); this
  // guards the markup contract the reflow depends on.
  test("keeps the retry label on one line at 320px", async () => {
    mountAtWidth(320);
    await renderInSyncError();

    const retryButton = screen.getByRole("button", { name: /retry/i });
    expectSingleLineButton(retryButton);
    expect(retryButton.textContent?.trim()).toBe("Retry");
  });
});
