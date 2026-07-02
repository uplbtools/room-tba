import { test, expect } from "@playwright/test";
import { campusSearchBox, waitForAppBoot } from "../helpers/app";
import { searchSuggestions } from "../helpers/search";

test.describe("staging data fidelity", () => {
  test("search returns a campus building suggestion", async ({ page }) => {
    await page.goto("/");
    await waitForAppBoot(page);
    await campusSearchBox(page).fill("Palma");
    await expect(
      searchSuggestions(page).getByRole("button").first(),
    ).toBeVisible({
      timeout: 20_000,
    });
  });

  test("term selector shows an active semester", async ({ page }) => {
    await page.goto("/");
    await waitForAppBoot(page);
    await expect(
      page.locator(".term-selector, .term-filter-chip").first(),
    ).toBeVisible({
      timeout: 15_000,
    });
  });
});
