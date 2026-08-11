import { test, expect } from "@playwright/test";
import { waitForAppBoot } from "../helpers/app";

/**
 * The Basemap toggle only renders while MapTiler is the live provider, so the
 * key must look healthy from this origin. The real key is domain-restricted
 * and 403s from localhost (see maptiler-fallback.spec.ts), which would hide
 * the toggle and turn this spec into a silent skip — stub every MapTiler
 * endpoint instead and assert the satellite source request actually fires.
 * Lives outside map-tools.spec.ts because the stubs must be registered
 * before the first goto, which that file's beforeEach already performs.
 */
test.describe("satellite basemap toggle", () => {
  test("switches to satellite imagery from the map controls", async ({
    page,
  }) => {
    test.skip(
      !process.env.PUBLIC_MAPTILER_KEY,
      "no PUBLIC_MAPTILER_KEY configured",
    );

    let satelliteTileJsonRequested = false;

    await page.route("https://api.maptiler.com/**", (route) => {
      const url = route.request().url();
      if (url.includes("satellite-v2/tiles.json")) {
        satelliteTileJsonRequested = true;
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            tilejson: "2.2.0",
            tiles: ["https://api.maptiler.com/satellite-stub/{z}/{x}/{y}.jpg"],
            minzoom: 0,
            maxzoom: 20,
          }),
        });
      }
      if (url.includes("tiles.json")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            tilejson: "2.2.0",
            tiles: ["https://api.maptiler.com/vector-stub/{z}/{x}/{y}.pbf"],
            minzoom: 0,
            maxzoom: 14,
          }),
        });
      }
      return route.fulfill({ status: 204, body: "" });
    });

    await page.goto("/");
    await waitForAppBoot(page);

    const toggle = page.getByRole("button", {
      name: /switch to satellite imagery/i,
    });
    await expect(toggle).toBeVisible();
    await expect(toggle).toHaveAttribute("aria-pressed", "false");
    await toggle.click();

    // The accessible name flips with the state (WCAG 2.5.3), so re-query.
    await expect(
      page.getByRole("button", { name: /switch to the standard map/i }),
    ).toHaveAttribute("aria-pressed", "true");

    // The imagery source is added lazily on first toggle; its TileJSON fetch
    // is the proof the layer actually reached MapLibre.
    await expect.poll(() => satelliteTileJsonRequested).toBe(true);
  });
});
