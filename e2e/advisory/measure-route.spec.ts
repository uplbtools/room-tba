import { expect, test } from "@playwright/test";
import { waitForAppBoot } from "../helpers/app";

// #848: measure route — drop two waypoints, expect mode pills with times and
// a per-leg breakdown (all computed client-side on the vendored walk graph).
test.describe("measure route tool @advisory", () => {
  test("two taps produce mode pills, totals, and clear works", async ({
    page,
  }) => {
    const pageErrors: Error[] = [];
    page.on("pageerror", (error) => pageErrors.push(error));

    await page.goto("/");
    await waitForAppBoot(page);

    await page.getByRole("button", { name: "Layers", exact: true }).click();
    await page.getByRole("switch", { name: "Measure route" }).click();

    await expect(
      page.getByText(/tap the map to drop waypoints/i),
    ).toBeVisible();

    const canvas = page.locator(".maplibregl-canvas");
    await expect(canvas).toBeVisible({ timeout: 20_000 });
    const box = await canvas.boundingBox();
    if (!box) throw new Error("map canvas has no bounding box");
    await canvas.click({
      position: { x: box.width * 0.3, y: box.height * 0.35 },
    });
    await canvas.click({
      position: { x: box.width * 0.65, y: box.height * 0.5 },
    });

    // Pills carry a time (or "no route") once legs are computed.
    const walkPill = page.getByRole("button", { name: "Walk", exact: true });
    await expect(walkPill).toBeVisible({ timeout: 20_000 });
    await expect(walkPill).toHaveText(/min|no route/);
    await expect(
      page.getByRole("button", { name: "Car / e-bike" }),
    ).toBeVisible();

    // Numbered waypoint markers are tappable removals.
    await expect(
      page.getByRole("button", { name: "Remove waypoint 1" }),
    ).toBeVisible();

    await page.getByRole("button", { name: /clear waypoints/i }).click();
    await expect(
      page.getByText(/tap the map to drop waypoints/i),
    ).toBeVisible();

    // Close removes the card.
    await page.getByRole("button", { name: /close measure route/i }).click();
    await expect(page.getByText(/measure route/i).first()).toBeHidden();

    expect(pageErrors).toEqual([]);
  });

  test("a pin tap only adds a waypoint", async ({ page }) => {
    await page.goto("/");
    await waitForAppBoot(page);
    await page.getByRole("button", { name: "Layers", exact: true }).click();
    await page.getByRole("switch", { name: "Measure route" }).click();

    const pin = page.locator(".map-entity-pin.building").first();
    await expect(pin).toBeVisible({ timeout: 30_000 });
    const url = page.url().split("#")[0];
    await pin.click({ force: true });

    await expect(
      page.getByRole("button", { name: "Remove waypoint 1" }),
    ).toBeVisible();
    // One waypoint, not two (the tap must not also reach the map), and no
    // place sheet opened over the tool.
    await expect(
      page.getByRole("button", { name: "Remove waypoint 2" }),
    ).toHaveCount(0);
    expect(page.url().split("#")[0]).toBe(url);
  });

  test("walking time stays on beside measuring; Back closes the newest first", async ({
    page,
  }) => {
    await page.goto("/");
    await waitForAppBoot(page);
    const canvas = page.locator(".maplibregl-canvas");
    await expect(canvas).toBeVisible({ timeout: 20_000 });
    const box = await canvas.boundingBox();
    if (!box) throw new Error("map canvas has no bounding box");

    await page.getByRole("button", { name: "Layers", exact: true }).click();
    await page.getByRole("switch", { name: "Walking time" }).click();
    await canvas.click({
      position: { x: box.width * 0.4, y: box.height * 0.45 },
    });

    await page.getByRole("button", { name: "Layers", exact: true }).click();
    await page.getByRole("switch", { name: "Measure route" }).click();

    const legend = page.getByRole("region", { name: "Walking time legend" });
    const measure = page.getByRole("region", { name: "Measure route" });
    await expect(legend).toBeVisible();
    await expect(measure).toBeVisible();

    await page.goBack();
    await expect(measure).toBeHidden();
    await expect(legend).toBeVisible();
    await page.goBack();
    await expect(legend).toBeHidden();
  });
});
