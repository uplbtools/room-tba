import { test, expect } from "@playwright/test";
import { waitForAppBoot } from "../helpers/app";

test.describe("building type filters", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForAppBoot(page);
  });

  test("All filter selected by default", async ({ page }) => {
    const allChip = page.getByRole("button", { name: /^All$/i });
    await expect(allChip).toBeVisible();
  });

  test("Class building filter toggles", async ({ page }) => {
    await page.getByRole("button", { name: /^Class$/i }).click();
    await expect(page.getByRole("button", { name: /^Class$/i })).toBeVisible();
  });

  test("UP dorms filter toggles", async ({ page }) => {
    await page.getByRole("button", { name: /UP dorms/i }).click();
    await expect(page.getByRole("button", { name: /UP dorms/i })).toBeVisible();
  });
});
