import { test, expect, type Page } from "@playwright/test";
import { waitForAppBoot } from "../helpers/app";
import {
  openAppMenu,
  openCampusDirectory,
  openSettingsModal,
} from "../helpers/map-tools";
import { openBuilding } from "../helpers/search";
import { E2E_FIXTURES } from "../../scripts/e2e-reset-db";

// Jakob audit macro 1: Back closes the topmost layer first and never leaves
// the app; macro 2: lists, search and bad links round-trip through the URL.

/** Still on the app (Back did not fall through to about:blank). */
async function expectInApp(page: Page, path = "/") {
  const url = new URL(page.url());
  expect(url.protocol).toMatch(/^https?:$/);
  expect(url.pathname).toBe(path);
}

test.describe("Back closes layers", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForAppBoot(page);
  });

  test("Back closes the app menu", async ({ page }) => {
    const menu = await openAppMenu(page);
    await page.goBack();
    await expect(menu).toBeHidden();
    await expectInApp(page);
  });

  test("Back closes a modal opened from the menu, then stays home", async ({
    page,
  }) => {
    const settings = await openSettingsModal(page);
    await expect(page.getByRole("dialog", { name: "App menu" })).toBeHidden();

    await page.goBack();
    await expect(settings).toBeHidden();
    await expectInApp(page);
    // The menu's own entry went with it: nothing is left to reopen.
    await expect(page.getByRole("dialog", { name: "App menu" })).toBeHidden();
  });

  test("closing a modal from its X leaves no entry for Back to land on", async ({
    page,
  }) => {
    const settings = await openSettingsModal(page);
    await page.keyboard.press("Escape");
    await expect(settings).toBeHidden();
    const length = await page.evaluate(() => history.length);

    await openSettingsModal(page);
    // Reopening reuses the freed slot instead of stacking past it.
    expect(await page.evaluate(() => history.length)).toBe(length);
  });

  test("Back pops the Layers sub-screen, then closes the sheet", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Layers", exact: true }).click();
    const layers = page.getByRole("dialog", { name: "Layers" });
    await expect(layers).toBeVisible();
    await layers.getByRole("button", { name: "Schedule route" }).click();
    await expect(
      layers.getByRole("button", { name: "Back to layers" }),
    ).toBeVisible();

    await page.goBack();
    await expect(layers.getByRole("heading", { name: "Layers" })).toBeVisible();
    await page.goBack();
    await expect(layers).toBeHidden();
    await expectInApp(page);
  });

  test("a chip list rides in ?browse= and Back closes it", async ({ page }) => {
    await openCampusDirectory(page, "buildings");
    await expect(page.getByRole("heading", { name: /Buildings/i })).toBeVisible(
      { timeout: 10_000 },
    );
    await expect(page).toHaveURL(/[?&]browse=buildings/);

    await page.goBack();
    await expect(page).not.toHaveURL(/browse=/);
    await expect(
      page.getByRole("heading", { name: /Buildings/i }),
    ).toBeHidden();
    await expectInApp(page);
  });

  test("Back from a place picked in a list returns to that list", async ({
    page,
  }) => {
    await openCampusDirectory(page, "buildings");
    await page
      .getByRole("button", { name: new RegExp(E2E_FIXTURES.buildingName, "i") })
      .first()
      .click();
    await expect(page).toHaveURL(/\/building\//);
    await expect(
      page.getByRole("button", { name: "Back to buildings" }),
    ).toBeVisible();

    await page.goBack();
    await expect(page).toHaveURL(/[?&]browse=buildings/);
    await page.goBack();
    await expectInApp(page);
  });
});

test.describe("URL state", () => {
  test("/?browse= opens that list on a fresh load", async ({ page }) => {
    await page.goto("/?browse=divisions");
    await waitForAppBoot(page);
    await expect(page.getByRole("heading", { name: /Divisions/i })).toBeVisible(
      { timeout: 10_000 },
    );
  });

  test("/?q= opens with that search running", async ({ page }) => {
    await page.goto(`/?q=${encodeURIComponent(E2E_FIXTURES.buildingName)}`);
    await page.locator("#app-loading-shell").waitFor({
      state: "detached",
      timeout: 120_000,
    });
    await expect(
      page.getByRole("searchbox", { name: /search campus/i }),
    ).toHaveValue(E2E_FIXTURES.buildingName);
  });

  test("a place opened from search shows no list breadcrumb", async ({
    page,
  }) => {
    await page.goto("/");
    await waitForAppBoot(page);
    await openBuilding(page);
    await expect(
      page.getByRole("heading", { name: E2E_FIXTURES.buildingName }),
    ).toBeVisible({ timeout: 10_000 });
    await expect(
      page.getByRole("button", { name: "Back to buildings" }),
    ).toHaveCount(0);
  });

  test("an unknown path says the place was not found", async ({ page }) => {
    await page.goto("/this-does-not-exist");
    await expect(page.getByText(/Place not found/i)).toBeVisible({
      timeout: 120_000,
    });
  });

  test("an unknown building says the place was not found", async ({ page }) => {
    await page.goto("/building/nonexistent/");
    await expect(page.getByText(/Place not found/i)).toBeVisible({
      timeout: 120_000,
    });
  });
});
