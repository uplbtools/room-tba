import { expect, test, type Page } from "@playwright/test";
import { E2E_FIXTURES } from "../../scripts/e2e-reset-db";
import { expandDetailsSheet, gotoHome, waitForAppBoot } from "../helpers/app";
import { openBuilding, searchAndSelect } from "../helpers/search";

// Any point on the map can be the start of directions and the "You are here"
// of the printable jeepney map: right-click on desktop, long-press on phones.

async function mapCanvasPoint(page: Page, fx: number, fy: number) {
  const canvas = page.locator(".maplibregl-canvas");
  await expect(canvas).toBeVisible({ timeout: 20_000 });
  const box = await canvas.boundingBox();
  if (!box) throw new Error("map canvas has no bounding box");
  return { x: box.x + box.width * fx, y: box.y + box.height * fy };
}

/** Right-click with a mouse, a held finger on a touch screen. */
async function openMapMenu(page: Page, isMobile: boolean) {
  const menu = page.getByRole("dialog", { name: "Map options" });
  const at = await mapCanvasPoint(page, 0.3, 0.42);
  // A press that lands while the first camera ease is still running can be
  // swallowed by the pan handler, so give it a few tries.
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if (isMobile) {
      // Playwright has no long-press; drive raw touch events over CDP.
      const cdp = await page.context().newCDPSession(page);
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchStart",
        touchPoints: [{ x: at.x, y: at.y }],
      });
      await page.waitForTimeout(800);
      await cdp.send("Input.dispatchTouchEvent", {
        type: "touchEnd",
        touchPoints: [],
      });
    } else {
      await page.mouse.click(at.x, at.y, { button: "right" });
    }
    const opened = await menu
      .waitFor({ state: "visible", timeout: 3000 })
      .then(() => true)
      .catch(() => false);
    if (opened) break;
  }
  await expect(menu).toBeVisible();
  return menu;
}

test.describe("directions and printable map from any point", () => {
  test("a spot on the map prints a jeep map and starts directions", async ({
    page,
    isMobile,
  }) => {
    const pageErrors: Error[] = [];
    page.on("pageerror", (error) => pageErrors.push(error));
    await gotoHome(page);
    await waitForAppBoot(page);

    const menu = await openMapMenu(page, isMobile);
    const printLink = menu.getByRole("link", {
      name: "Printable jeep map from here",
    });
    const href = await printLink.getAttribute("href");
    expect(href).toMatch(
      /^\/api\/transit-map\?lat=-?\d+\.\d{5}&lon=-?\d+\.\d{5}$/,
    );
    const pdf = await page.request.get(href as string);
    expect(pdf.status()).toBe(200);
    expect(pdf.headers()["content-type"]).toBe("application/pdf");

    await menu.getByRole("button", { name: "Directions from here" }).click();
    await expect(menu).toBeHidden();
    const stops = page.getByRole("list", { name: "Directions stop sequence" });
    await expect(stops.getByText("Dropped pin")).toBeVisible();
    await expect(stops.getByText("Choose a destination")).toBeVisible();

    // Any search result can be the destination.
    await searchAndSelect(
      page,
      E2E_FIXTURES.buildingName,
      new RegExp(E2E_FIXTURES.buildingName, "i"),
    );
    await expect(
      stops.getByRole("button", {
        name: `Change destination, now ${E2E_FIXTURES.buildingName}`,
      }),
    ).toBeVisible();
    await expect(stops.getByText("Dropped pin")).toBeVisible();
    await expect(
      page.getByText(/Search for a place or tap the map/),
    ).toBeHidden();

    expect(pageErrors).toEqual([]);
  });

  test("the start of directions can be moved off GPS with a map tap", async ({
    page,
    context,
  }) => {
    await context.grantPermissions([]); // no GPS fix, like a denied prompt
    await gotoHome(page);
    await waitForAppBoot(page);
    await openBuilding(page);
    await expandDetailsSheet(page);
    await page
      .getByRole("button", {
        name: `Get directions to ${E2E_FIXTURES.buildingName}`,
      })
      .click();

    const stops = page.getByRole("list", { name: "Directions stop sequence" });
    const start = stops.getByRole("button", { name: /^Change starting point/ });
    await expect(start).toHaveAccessibleName(
      "Change starting point, now Your location",
    );
    await start.click();
    await expect(stops.getByText("Choose a starting point")).toBeVisible();

    const at = await mapCanvasPoint(page, 0.3, 0.42);
    await page.mouse.click(at.x, at.y);
    await expect(start).not.toHaveAccessibleName(
      "Change starting point, now Your location",
    );
    await expect(page.getByText("Waiting for your location")).toBeHidden();
  });
});
