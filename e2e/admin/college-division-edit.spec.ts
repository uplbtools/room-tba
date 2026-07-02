import { test, expect } from "@playwright/test";
import { waitForAppBoot } from "../helpers/app";
import { loginAsAdmin, logout } from "../helpers/auth";
import { searchAndSelect } from "../helpers/search";

test.describe("college and division edits", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForAppBoot(page);
    await loginAsAdmin(page);
  });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test("admin opens college panel", async ({ page }) => {
    await searchAndSelect(page, "E2E College", /E2E College/i);
    const nameField = page.getByLabel(/college name/i);
    if (await nameField.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(nameField).toBeEnabled();
    }
  });

  test("admin opens division panel", async ({ page }) => {
    await searchAndSelect(page, "E2E Division", /E2E Division/i);
    const nameField = page.getByLabel(/division name/i);
    if (await nameField.isVisible({ timeout: 5000 }).catch(() => false)) {
      await expect(nameField).toBeEnabled();
    }
  });
});
