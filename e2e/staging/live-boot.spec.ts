import { test, expect } from "@playwright/test";
import { waitForAppBoot } from "../helpers/app";

test.describe("staging live boot", () => {
  test("homepage loads", async ({ page }) => {
    await page.goto("/");
    await waitForAppBoot(page);
    await expect(page.getByPlaceholder("Search campus")).toBeVisible();
  });

  test("/admin redirects", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/editor=login/);
  });
});
