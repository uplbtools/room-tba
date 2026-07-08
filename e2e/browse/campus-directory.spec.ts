import { test, expect, type Page } from "@playwright/test";
import { waitForAppBoot, campusSearchBox } from "../helpers/app";
import { searchSuggestions } from "../helpers/search";
import { E2E_FIXTURES } from "../../scripts/e2e-reset-db";

const orgPattern = new RegExp(E2E_FIXTURES.orgName, "i");
const placePattern = new RegExp(E2E_FIXTURES.placeName, "i");

// The entity name also appears as a map-pin button, so scope directory
// interactions to the browse list rows (button.entity-list-row) specifically.
function directoryRow(page: Page, pattern: RegExp) {
  return page
    .locator("button.entity-list-row")
    .filter({ hasText: pattern })
    .first();
}

test.describe("campus directory (orgs, offices, places)", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForAppBoot(page);
  });

  test("Orgs chip opens the directory listing the seeded org", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Browse orgs" }).click();
    await expect(
      page.getByRole("heading", { name: /Orgs & Offices/i }),
    ).toBeVisible({ timeout: 10_000 });
    await expect(directoryRow(page, orgPattern)).toBeVisible({
      timeout: 10_000,
    });
  });

  test("selecting an org from the directory opens its detail panel", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Browse orgs" }).click();
    await directoryRow(page, orgPattern).click({ timeout: 15_000 });
    await expect(
      page.getByRole("heading", { name: E2E_FIXTURES.orgName }),
    ).toBeVisible({ timeout: 10_000 });
  });

  test("searching an org name surfaces a suggestion that selects it", async ({
    page,
  }) => {
    await campusSearchBox(page).fill(E2E_FIXTURES.orgName);
    const suggestion = searchSuggestions(page)
      .locator("button.suggestion")
      .filter({ hasText: orgPattern })
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
