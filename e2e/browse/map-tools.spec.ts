import { test, expect } from "@playwright/test";
import { waitForAppBoot } from "../helpers/app";
import {
  openAppSidebar,
  openHelpSettingsSection,
  clickSidebarNav,
} from "../helpers/map-tools";

test.describe("map settings", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForAppBoot(page);
  });

  async function openSettings(page: import("@playwright/test").Page) {
    const sidebar = await openAppSidebar(page);
    await openHelpSettingsSection(sidebar);
    await clickSidebarNav(sidebar, "Settings", { exact: true });
    const settings = page.getByRole("dialog", { name: "Settings" });
    await expect(settings).toBeVisible();
    return settings;
  }

  test("settings opens", async ({ page }) => {
    await openSettings(page);
  });

  test("terrain off by default", async ({ page }) => {
    const settings = await openSettings(page);
    const terrainToggle = settings.getByRole("button", {
      name: /turn terrain on/i,
    });
    await expect(terrainToggle).toBeVisible();
    await expect(terrainToggle).toHaveAttribute("aria-pressed", "false");
  });
});
