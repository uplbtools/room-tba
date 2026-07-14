import { test, expect } from "@playwright/test";
import { campusSearchBox, waitForAppBoot } from "../helpers/app";
import { openAppSidebar } from "../helpers/map-tools";

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

  // Open sidebar to ensure it doesn't break
  const sidebar = await openAppSidebar(page);
  await sidebar.getByRole("button", { name: "Buildings" }).click();
  await expect(
    page.locator(".side-panel-details h2", { hasText: "Buildings" }),
  ).toBeVisible();
});
