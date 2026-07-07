import { test, expect } from "@playwright/test";
import { campusSearchBox, waitForAppBoot } from "../helpers/app";

test("Layout remains functional at 150% zoom", async ({ page }) => {
  await page.goto("/");
  await waitForAppBoot(page);

  // Simulate 150% zoom (accessibility test)
  await page.evaluate(() => {
    (document.body.style as CSSStyleDeclaration & { zoom: string }).zoom =
      "1.5";
  });

  // Check if main UI elements are still accessible
  await expect(campusSearchBox(page)).toBeVisible();
  await expect(page.locator("button.app-menu__trigger")).toBeVisible();

  // Open sidebar to ensure it doesn't break
  await page
    .locator("button.map-chrome-chip", { hasText: "Buildings" })
    .click();
  await expect(
    page.locator(".side-panel-details h2", { hasText: "Buildings" }),
  ).toBeVisible();
});
