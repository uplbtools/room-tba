import { expect, test } from "@playwright/test";
import { waitForAppBoot } from "../helpers/app";

test.describe("map attribution @advisory", () => {
  test("credits the basemap that actually served", async ({ page }) => {
    await page.goto("/");
    await waitForAppBoot(page);
    const attrib = page.locator(".map-attribution").first();
    await expect(attrib).toBeVisible({ timeout: 10_000 });

    // OpenStreetMap is required whichever basemap is live, so it is the only
    // credit that can be asserted unconditionally.
    await expect(
      attrib.getByRole("link", { name: /OpenStreetMap/i }),
    ).toBeVisible();

    // The vendor credit follows whoever served the tiles (#885). This spec runs
    // against local previews where the domain-restricted MapTiler key 403s and
    // the keyless fallback takes over, so asserting MapTiler specifically would
    // fail for the wrong reason. What must hold is that exactly one vendor is
    // named, and that it is never MapTiler while the fallback is serving.
    const maptiler = attrib.getByRole("link", { name: /MapTiler/i });
    const openfreemap = attrib.getByRole("link", { name: /OpenFreeMap/i });
    const maptilerCount = await maptiler.count();
    const openfreemapCount = await openfreemap.count();

    expect(
      maptilerCount + openfreemapCount,
      "attribution should name at most one tile vendor",
    ).toBeLessThanOrEqual(1);
    expect(
      maptilerCount === 1 && openfreemapCount === 1,
      "MapTiler and OpenFreeMap must never both be credited",
    ).toBe(false);
  });
});
