import { test, expect } from "@playwright/test";
import { waitForAppBoot } from "../helpers/app";

test.describe("map attribution @advisory", () => {
  test("OSM and MapTiler credits visible without expand", async ({ page }) => {
    await page.goto("/");
    await waitForAppBoot(page);
    const attrib = page.locator(".map-attribution").first();
    await expect(attrib).toBeVisible({ timeout: 10_000 });
    await expect(
      attrib.getByRole("link", { name: /OpenStreetMap/i }),
    ).toBeVisible();
    await expect(attrib.getByRole("link", { name: /MapTiler/i })).toBeVisible();
  });
});
