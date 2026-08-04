import { test, expect } from "@playwright/test";
import { waitForAppBoot } from "../helpers/app";

/**
 * #863: a MapTiler key that is present but rejected used to render a blank
 * basemap under working pins. liberty-customized.json is served from our own
 * origin and still succeeds, so the only way to see the outage is the tile
 * request — which is exactly what this spec forces.
 */
test.describe("MapTiler fallback @advisory", () => {
  test("a rejected key still renders a basemap", async ({ page }) => {
    let fallbackRequested = false;

    // Every MapTiler request 403s, exactly as the outage did.
    await page.route("https://api.maptiler.com/**", (route) =>
      route.fulfill({ status: 403, body: "Forbidden" }),
    );

    // Keep the test off the public internet: serve a minimal keyless style.
    await page.route("https://tiles.openfreemap.org/**", (route) => {
      fallbackRequested = true;
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          version: 8,
          name: "positron-stub",
          sources: {},
          layers: [
            {
              id: "background",
              type: "background",
              paint: { "background-color": "#f8f8f8" },
            },
          ],
        }),
      });
    });

    await page.goto("/");
    await waitForAppBoot(page);

    // The map still comes up rather than failing to a blank canvas.
    await expect(page.locator("canvas.maplibregl-canvas").first()).toBeVisible({
      timeout: 30_000,
    });
    expect(fallbackRequested).toBe(true);
  });

  test("an accepted key keeps the custom campus style", async ({ page }) => {
    // Without a key the app is *supposed* to serve the fallback, so there is
    // nothing to assert here.
    test.skip(
      !process.env.PUBLIC_MAPTILER_KEY,
      "no PUBLIC_MAPTILER_KEY configured",
    );

    let fallbackRequested = false;
    let campusStyleRequested = false;

    // Stub MapTiler as healthy so the result does not depend on whether the
    // real key accepts this origin (the prod key is domain-restricted).
    await page.route("https://api.maptiler.com/**", (route) => {
      if (route.request().url().includes("tiles.json")) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            tilejson: "2.2.0",
            tiles: ["https://api.maptiler.com/stub/{z}/{x}/{y}.pbf"],
            minzoom: 0,
            maxzoom: 14,
          }),
        });
      }
      return route.fulfill({ status: 204, body: "" });
    });
    await page.route("https://tiles.openfreemap.org/**", (route) => {
      fallbackRequested = true;
      return route.abort();
    });
    page.on("request", (r) => {
      if (r.url().endsWith("/liberty-customized.json"))
        campusStyleRequested = true;
    });

    await page.goto("/");
    await waitForAppBoot(page);

    await expect(page.locator("canvas.maplibregl-canvas").first()).toBeVisible({
      timeout: 30_000,
    });
    expect(campusStyleRequested).toBe(true);
    // Guards the reverted emergency patch (b2ba8e1d), which returned the
    // fallback unconditionally and never loaded the campus style.
    expect(fallbackRequested).toBe(false);
  });
});
