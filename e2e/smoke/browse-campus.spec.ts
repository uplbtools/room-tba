import { test, expect } from "@playwright/test";

test("Campus browse chips open side panel and handle pin filters", async ({ page }) => {
  await page.goto("/");
  
  // Click "Classes" chip
  await page.locator("button.map-chrome-chip", { hasText: "Classes" }).click();
  
  // Wait for side panel classes list
  await expect(page.locator(".side-panel-details h2", { hasText: "All classes" })).toBeVisible();

  // Verify that the "All" building pin filter chip is NOT highlighted (#401 regression)
  const allBuildingFilter = page.locator(".building-filter-bar button", { hasText: "All" });
  await expect(allBuildingFilter).not.toHaveClass(/map-chrome-chip--filter-selected/);

  // Click "Buildings" chip
  await page.locator("button.map-chrome-chip", { hasText: "Buildings" }).click();
  
  // Wait for side panel buildings list
  await expect(page.locator(".side-panel-details h2", { hasText: "Buildings" })).toBeVisible();

  // Click "Colleges" chip
  await page.locator("button.map-chrome-chip", { hasText: "Colleges" }).click();
  await expect(page.locator(".side-panel-details h2", { hasText: "Colleges" })).toBeVisible();

  // Click "Divisions" chip
  await page.locator("button.map-chrome-chip", { hasText: "Divisions" }).click();
  await expect(page.locator(".side-panel-details h2", { hasText: "Divisions" })).toBeVisible();
});
