import { test, expect } from "@playwright/test";
import { waitForAppBoot } from "../helpers/app";
import {
  expandMapToolsSection,
  openMapTools,
  openSettingsModal,
} from "../helpers/map-tools";

test.describe("map settings", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForAppBoot(page);
  });

  test("settings opens", async ({ page }) => {
    await openSettingsModal(page);
  });

  // Terrain lives in Layers only; Settings has no map controls.
  test("terrain off by default", async ({ page }) => {
    await openMapTools(page);
    await expandMapToolsSection(page, "Terrain");
    const layers = page.getByRole("dialog", { name: /^layers$/i });
    const terrainToggle = layers.getByRole("switch", {
      name: /makiling terrain/i,
    });
    await expect(terrainToggle).toBeVisible();
    await expect(terrainToggle).toHaveAttribute("aria-checked", "false");
  });
});
