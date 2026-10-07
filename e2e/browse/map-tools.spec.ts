import { test, expect } from "@playwright/test";
import { waitForAppBoot } from "../helpers/app";
import { openSettingsModal } from "../helpers/map-tools";

test.describe("map settings", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForAppBoot(page);
  });

  test("settings opens", async ({ page }) => {
    await openSettingsModal(page);
  });

  test("terrain off by default", async ({ page }) => {
    const settings = await openSettingsModal(page);
    const terrainToggle = settings.getByRole("switch", {
      name: /makiling terrain/i,
    });
    await expect(terrainToggle).toBeVisible();
    await expect(terrainToggle).toHaveAttribute("aria-checked", "false");
  });
});
