import { test, expect } from "@playwright/test";
import { waitForAppBoot } from "../helpers/app";

test.describe("map attribution @advisory", () => {
  test("attribution visible on map", async ({ page }) => {
    await page.goto("/");
    await waitForAppBoot(page);
    await expect(page.locator(".map-attribution, .maplibregl-ctrl-attrib").first()).toBeVisible({
      timeout: 10_000,
    });
  });
});
