import { test, expect } from "@playwright/test";
import { campusSearchBox, waitForAppBoot } from "../helpers/app";

test.describe("smoke boot", () => {
  test("app loads after dismissing landing", async ({ page }) => {
    page.on("pageerror", (err) => {
      throw err;
    });
    await page.goto("/");
    await waitForAppBoot(page);
    await expect(campusSearchBox(page)).toBeVisible();
  });

  test("viewport meta initial-scale=1", async ({ page }) => {
    await page.goto("/");
    const content = await page
      .locator('meta[name="viewport"]')
      .getAttribute("content");
    expect(content).toContain("initial-scale=1");
  });
});
