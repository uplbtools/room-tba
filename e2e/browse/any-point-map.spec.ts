import { expect, test, type Page } from "@playwright/test";
import { E2E_FIXTURES } from "../../scripts/e2e-reset-db";
import { expandDetailsSheet, gotoHome, waitForAppBoot } from "../helpers/app";
import { openBuilding, searchSuggestions } from "../helpers/search";

// Any point on the map can be the start of directions and the "You are here"
// of the printable jeepney map: right-click on desktop, long-press on phones
// drops a pin and opens the Dropped pin sheet (Google Maps).

async function mapCanvasPoint(page: Page, fx: number, fy: number) {
  const canvas = page.locator(".maplibregl-canvas");
  await expect(canvas).toBeVisible({ timeout: 20_000 });
  const box = await canvas.boundingBox();
  if (!box) throw new Error("map canvas has no bounding box");
  return { x: box.x + box.width * fx, y: box.y + box.height * fy };
}

/** Right-click with a mouse, a held finger on a touch screen. */
async function dropPin(page: Page, isMobile: boolean) {
  const heading = page.getByRole("heading", { name: "Dropped pin" });
  const menu = page.locator(".dropped-pin");
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
    const opened = await heading
      .waitFor({ state: "visible", timeout: 3000 })
      .then(() => true)
      .catch(() => false);
    if (opened) break;
  }
  await expect(heading).toBeVisible();
  await expect(page.getByRole("img", { name: "Dropped pin" })).toBeVisible();
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

    const menu = await dropPin(page, isMobile);
    await expect(menu.getByText(/^1?\d\.\d{5}, 1\d{2}\.\d{5}$/)).toBeVisible();
    const printLink = menu.getByRole("link", { name: "Printable jeep map" });
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
    const start = stops.getByRole("searchbox", { name: "Starting point" });
    const end = stops.getByRole("searchbox", { name: "Destination" });
    await expect(start).toHaveValue("Dropped pin");
    await expect(end).toHaveValue("");
    await expect(end).toHaveAttribute("placeholder", "Choose destination");

    // The To field searches places inline; any result can be the destination.
    await end.fill(E2E_FIXTURES.buildingName);
    const suggestion = searchSuggestions(page)
      .locator("button.suggestion")
      .filter({ hasText: new RegExp(E2E_FIXTURES.buildingName, "i") })
      .first();
    await suggestion.click({ timeout: 30_000 });
    await expect(end).toHaveValue(E2E_FIXTURES.buildingName);
    await expect(start).toHaveValue("Dropped pin");
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
    const start = stops.getByRole("searchbox", { name: "Starting point" });
    // No fix: the start is empty, never a stale "Your location".
    await expect(start).toHaveValue("");

    // Arm the start field, then tap the map instead of typing.
    await start.focus();
    await start.blur();
    const at = await mapCanvasPoint(page, 0.3, 0.42);
    await page.mouse.click(at.x, at.y);
    await expect(start).toHaveValue("Dropped pin");
    await expect(page.getByText("Waiting for your location")).toBeHidden();
  });
});
