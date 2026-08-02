import { expect, test } from "@playwright/test";
import { waitForAppBoot } from "../helpers/app";

// #847: travel-time isochrone — activate from the Map tools chip, tap the
// map, and the walking-minutes legend should render (graph loads lazily and
// Dijkstra runs client-side, so no network mocking is needed).
test.describe("travel time tool @advisory", () => {
  test("tapping the map colors paths and shows the minutes legend", async ({
    page,
  }) => {
    const pageErrors: Error[] = [];
    page.on("pageerror", (error) => pageErrors.push(error));

    await page.goto("/");
    await waitForAppBoot(page);

    await page.getByRole("button", { name: "Map tools", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Map tools" })).toBeVisible();
    await page.getByRole("button", { name: /travel time/i }).click();

    // Tool active: panel hands the map back and the legend prompts for a tap.
    await expect(page.getByText(/tap the map/i)).toBeVisible();

    const canvas = page.locator(".maplibregl-canvas");
    await expect(canvas).toBeVisible({ timeout: 20_000 });
    const box = await canvas.boundingBox();
    if (!box) throw new Error("map canvas has no bounding box");
    // Off-center tap to dodge entity pins layered over the canvas middle.
    await canvas.click({
      position: { x: box.width * 0.35, y: box.height * 0.35 },
    });

    // Ramp legend with the cap tick replaces the prompt once Dijkstra ran.
    await expect(page.getByText("30+ min")).toBeVisible({ timeout: 20_000 });
    await expect(
      page.getByText(/paths © OpenStreetMap contributors/i),
    ).toBeVisible();

    // Turning the tool off removes the legend.
    await page.getByRole("button", { name: /turn off travel time/i }).click();
    await expect(page.getByText("30+ min")).toBeHidden();

    expect(pageErrors).toEqual([]);
  });
});
