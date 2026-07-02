import { test, expect } from "@playwright/test";
import { waitForAppBoot } from "../helpers/app";

test.describe("map tools", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForAppBoot(page);
  });

  test("flyout opens", async ({ page }) => {
    await page.getByRole("button", { name: /map tools/i }).click();
    await expect(
      page.getByRole("dialog", { name: /map tools/i }),
    ).toBeVisible();
  });

  test("terrain off by default", async ({ page }) => {
    await page.getByRole("button", { name: /map tools/i }).click();
    const terrainBtn = page.getByRole("button", { name: /terrain|makiling/i });
    if (await terrainBtn.isVisible().catch(() => false)) {
      await expect(terrainBtn).toHaveAttribute("aria-pressed", "false");
    }
  });
});
