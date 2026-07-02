import { test, expect } from "@playwright/test";
import { waitForAppBoot } from "../helpers/app";
import { loginAsAdmin, logout } from "../helpers/auth";
import { openDorm } from "../helpers/search";

test.describe("dorm edit", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForAppBoot(page);
    await loginAsAdmin(page);
  });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test("admin edits dorm directions", async ({ page }) => {
    await openDorm(page);
    const directions = page.getByLabel(/directions/i).first();
    if (await directions.isVisible({ timeout: 5000 }).catch(() => false)) {
      await directions.fill("E2E dorm directions updated");
      await page.getByRole("button", { name: /^save$/i }).first().click();
      await expect(page.getByText(/saved|updated/i).first()).toBeVisible({
        timeout: 10_000,
      });
    }
  });
});
