import { test, expect } from "@playwright/test";
import { waitForAppBoot } from "../helpers/app";
import { openBuilding } from "../helpers/search";
import { buildingPagePath } from "../helpers/search";

test.describe("entity SEO", () => {
  test("building page has og:title and canonical", async ({ page }) => {
    await page.goto(buildingPagePath());
    const ogTitle = page.locator('meta[property="og:title"]');
    await expect(ogTitle).toHaveAttribute("content", /.+/);
    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveAttribute("href", /\/building\//);
  });

  test("search updates URL with entity path", async ({ page }) => {
    await page.goto("/");
    await waitForAppBoot(page);
    await openBuilding(page);
    await expect(page).toHaveURL(/building=|\/building\//, { timeout: 10_000 });
  });
});
