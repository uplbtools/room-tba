import { test, expect } from "@playwright/test";
import { waitForAppBoot } from "../helpers/app";
import { openBuilding, buildingPagePath } from "../helpers/search";
import { E2E_FIXTURES } from "../../scripts/e2e-reset-db";

test.describe("entity SEO", () => {
  test("building page has og:title and canonical", async ({ page }) => {
    await page.goto(buildingPagePath());
    const ogTitle = page.locator('meta[property="og:title"]');
    await expect(ogTitle).toHaveAttribute("content", /.+/);
    const canonical = page.locator('link[rel="canonical"]');
    await expect(canonical).toHaveAttribute("href", /\/building\//);
  });

  test("search updates URL with entity path", async ({ page, isMobile }) => {
    await page.goto("/");
    await waitForAppBoot(page);
    await openBuilding(page);
    if (isMobile) {
      await expect(
        page.getByText(E2E_FIXTURES.buildingName).first(),
      ).toBeVisible();
      return;
    }
    await page.waitForURL(/building=|\/building\//, { timeout: 20_000 });
    await expect(page).toHaveURL(/building=|\/building\//);
  });
});
