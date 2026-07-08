import { test, expect } from "@playwright/test";
import { waitForAppBoot } from "../helpers/app";

// The App menu is where features keep silently disappearing (editor sign-in
// link, offline maps, leaderboard) because no blocking e2e ever opened it.
// These tests assert the menu surface so regressions fail CI instead of
// shipping.
test.describe("app menu", () => {
  test("opens and shows its core entries", async ({ page }) => {
    await page.goto("/");
    await waitForAppBoot(page);

    await page.getByRole("button", { name: "App menu" }).click();
    const panel = page.getByRole("dialog", { name: "App menu" });
    await expect(panel).toBeVisible();

    // Guest sees the offline download trigger, the leaderboard entry, and the
    // editor sign-in action (shown only when logged out).
    await expect(panel.locator(".offline-trigger")).toBeVisible();
    await expect(
      panel.getByRole("button", { name: /leaderboard/i }),
    ).toBeVisible();
    await expect(
      panel.getByRole("button", { name: /editor sign in/i }),
    ).toBeVisible();
  });

  test("offline popover opens without closing the App menu", async ({
    page,
  }) => {
    await page.goto("/");
    await waitForAppBoot(page);

    await page.getByRole("button", { name: "App menu" }).click();
    const panel = page.getByRole("dialog", { name: "App menu" });
    await expect(panel).toBeVisible();

    await panel.locator(".offline-trigger").click();
    // Regression guard (offline maps, #108/#380): opening the offline popover
    // must not dismiss the App menu it is nested inside, which previously
    // unmounted the popover before it could render.
    await expect(page.locator("#offline-maps-dialog")).toBeVisible();
    await expect(panel).toBeVisible();
  });
});
