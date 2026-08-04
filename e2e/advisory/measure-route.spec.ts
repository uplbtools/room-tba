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

    await page.getByRole("button", { name: "Map tools", exact: true }).click();
    await page.getByRole("button", { name: /measure route/i }).click();

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
});
