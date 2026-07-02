import { test, expect } from "@playwright/test";
import { waitForAppBoot } from "../helpers/app";

test.describe("staging data fidelity", () => {
  test("search returns a campus building suggestion", async ({ page }) => {
    await page.goto("/");
    await waitForAppBoot(page);
    await page.getByPlaceholder("Search campus").fill("Palma");
    await expect(page.getByRole("option").first()).toBeVisible({
      timeout: 20_000,
    });
  });

  test("term selector shows an active semester", async ({ page }) => {
    await page.goto("/");
    await waitForAppBoot(page);
    await expect(page.locator(".term-selector, .term-filter-chip").first()).toBeVisible({
      timeout: 15_000,
    });
  });
});
