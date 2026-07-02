import { test, expect } from "@playwright/test";

test.describe("admin redirects", () => {
  test("/admin redirects to in-app login", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/editor=login/);
  });

  test("/admin/login redirects to in-app login", async ({ page }) => {
    await page.goto("/admin/login");
    await expect(page).toHaveURL(/editor=login/);
  });

  test("/?editor=login opens login dialog", async ({ page }) => {
    await page.goto("/?editor=login");
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.locator("#admin-login-title")).toBeVisible();
  });
});
