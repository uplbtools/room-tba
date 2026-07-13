import { test, expect, type Page } from "@playwright/test";
import { waitForAppBoot, campusSearchBox } from "../helpers/app";
import { openAppSidebar } from "../helpers/map-tools";
import { searchSuggestions } from "../helpers/search";
import { E2E_FIXTURES } from "../../scripts/e2e-reset-db";

const officePattern = new RegExp(E2E_FIXTURES.orgName, "i");
const placePattern = new RegExp(E2E_FIXTURES.placeName, "i");

// The entity name also appears as a map-pin button, so scope directory
// interactions to the browse list rows (button.entity-list-row) specifically.
function directoryRow(page: Page, pattern: RegExp) {
  return page
    .locator("button.entity-list-row")
    .filter({ hasText: pattern })
    .first();
}

test.describe("campus directory (offices and places)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForAppBoot(page);
  });

  async function browseOffices(page: Page) {
    const sidebar = await openAppSidebar(page);
    await sidebar.getByRole("button", { name: "Units & offices" }).click();
  }

  test("Units & offices opens the directory listing the seeded office", async ({
    page,
  }) => {
    await browseOffices(page);
    await expect(
      page.getByRole("heading", { name: "Offices & Academic Units" }),
    ).toBeVisible({ timeout: 10_000 });
    await expect(directoryRow(page, officePattern)).toBeVisible({
      timeout: 10_000,
    });
  });

  test("selecting an office from the directory opens its detail panel", async ({
    page,
  }) => {
    await browseOffices(page);
    await directoryRow(page, officePattern).click({ timeout: 15_000 });
    await expect(
      page.getByRole("heading", { name: E2E_FIXTURES.orgName }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("searching an office name surfaces a suggestion that selects it", async ({
    page,
  }) => {
    await campusSearchBox(page).fill(E2E_FIXTURES.orgName);
    const suggestion = searchSuggestions(page)
      .locator("button.suggestion")
      .filter({ hasText: officePattern })
      .first();
    await suggestion.waitFor({ state: "visible", timeout: 30_000 });
    await suggestion.click({ timeout: 15_000 });
    await expect(
      page.getByRole("heading", { name: E2E_FIXTURES.orgName }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("searching a place name surfaces a suggestion that selects it", async ({
    page,
  }) => {
    await campusSearchBox(page).fill(E2E_FIXTURES.placeName);
    const suggestion = searchSuggestions(page)
      .locator("button.suggestion")
      .filter({ hasText: placePattern })
      .first();
    await suggestion.waitFor({ state: "visible", timeout: 30_000 });
    await suggestion.click({ timeout: 15_000 });
    await expect(
      page.getByRole("heading", { name: E2E_FIXTURES.placeName }),
    ).toBeVisible({ timeout: 10_000 });
  });
});
