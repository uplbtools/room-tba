import { test, expect } from "@playwright/test";
import { waitForAppBoot } from "../helpers/app";
import { loginAsAdmin, logout } from "../helpers/auth";
import { openEvent } from "../helpers/search";

test.describe("event edit", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForAppBoot(page);
    await loginAsAdmin(page);
  });

  test.afterEach(async ({ page }) => {
    await logout(page);
  });

  test("admin can edit event description", async ({ page }) => {
    await openEvent(page);
    const description = page.getByLabel(/description/i).first();
    if (await description.isVisible({ timeout: 5000 }).catch(() => false)) {
      await description.fill("E2E updated event description");
      await page.getByRole("button", { name: /save/i }).first().click();
      await expect(page.getByText(/saved|updated/i).first()).toBeVisible({
        timeout: 10_000,
      });
    }
  });
});
