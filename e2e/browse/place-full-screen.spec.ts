import { expect, type Page, test } from "@playwright/test";
import { E2E_FIXTURES } from "../../scripts/e2e-reset-db";
import { waitForAppBoot } from "../helpers/app";
import { openBuilding } from "../helpers/search";

/** #1289: on phones a place opens as a preview card, then full screen. */
test.describe("place full-screen view @mobile", () => {
  const name = new RegExp(E2E_FIXTURES.buildingName, "i");
  const fullScreen = (page: Page) =>
    page.getByRole("dialog", { name: "Place details" });
  const title = (page: Page) =>
    page.locator(".bottom-sheet .place-sheet-header__title");

  async function openFullScreen(page: Page) {
    await title(page).click();
    await expect(fullScreen(page)).toBeVisible();
  }

  test.beforeEach(async ({ page, isMobile }) => {
    test.skip(!isMobile, "mobile only");
    await page.goto("/");
    await waitForAppBoot(page);
    await openBuilding(page);
    await expect(title(page)).toHaveText(name);
  });

  test("tapping the preview fills the screen, and a drag does not move it", async ({
    page,
  }) => {
    await openFullScreen(page);
    const viewport = page.viewportSize();
    await expect
      .poll(async () => (await fullScreen(page).boundingBox())?.y ?? 99)
      .toBeLessThanOrEqual(1);
    const box = await fullScreen(page).boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(
      (viewport?.height ?? 0) - 1,
    );
    await expect(
      page.getByRole("button", { name: "Back to map" }),
    ).toBeFocused();

    const body = await page.locator(".bottom-sheet__body").boundingBox();
    if (!body) throw new Error("sheet body has no box");
    const x = body.x + body.width / 2;
    await page.mouse.move(x, body.y + 40);
    await page.mouse.down();
    await page.mouse.move(x, body.y + 320, { steps: 8 });
    await page.mouse.up();
    expect((await fullScreen(page).boundingBox())?.y ?? 99).toBeLessThanOrEqual(
      1,
    );
  });

  test("Escape and Back return to the same preview", async ({ page }) => {
    await openFullScreen(page);
    await page.keyboard.press("Escape");
    await expect(fullScreen(page)).toBeHidden();
    await expect(title(page)).toHaveText(name);

    await openFullScreen(page);
    await page.goBack();
    await expect(fullScreen(page)).toBeHidden();
    await expect(title(page)).toHaveText(name);
  });

  test("rotating to landscape and back keeps the place full screen", async ({
    page,
  }) => {
    await openFullScreen(page);
    const portrait = page.viewportSize();
    if (!portrait) throw new Error("no viewport");

    await page.setViewportSize({ width: 750, height: 342 });
    await expect(fullScreen(page)).toBeHidden();
    await expect(page.getByRole("heading", { name })).toBeVisible();

    await page.setViewportSize(portrait);
    await expect(fullScreen(page)).toBeVisible();
  });
});
