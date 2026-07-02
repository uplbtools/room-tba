import { test, expect } from "@playwright/test";
import { waitForAppBoot } from "../helpers/app";
import { expandMapToolsSection, openMapTools } from "../helpers/map-tools";

test.describe("map tools", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForAppBoot(page);
  });

  test("flyout opens", async ({ page }) => {
    await openMapTools(page);
  });

  test("terrain off by default", async ({ page }) => {
    await openMapTools(page);
    await expandMapToolsSection(page, "Terrain");
    const terrainToggle = page.getByRole("button", {
      name: /turn terrain on/i,
    });
    await expect(terrainToggle).toBeVisible();
    await expect(terrainToggle).toHaveAttribute("aria-pressed", "false");
  });
});
