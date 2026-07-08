import { test, expect } from "@playwright/test";
import { waitForAppBoot, campusSearchBox } from "../helpers/app";
import { searchSuggestions } from "../helpers/search";
import { E2E_FIXTURES } from "../../scripts/e2e-reset-db";

const orgPattern = new RegExp(E2E_FIXTURES.orgName, "i");

test.describe("campus directory (orgs & offices)", () => {
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
    await expect(page.getByRole("button", { name: orgPattern })).toBeVisible({
      timeout: 10_000,
    });
  });

  test("selecting an org from the directory opens its detail panel", async ({
    page,
  }) => {
    await page.getByRole("button", { name: "Browse orgs" }).click();
    await page.getByRole("button", { name: orgPattern }).first().click();
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
});
