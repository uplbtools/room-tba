import { test, expect } from "@playwright/test";
import { waitForAppBoot } from "../helpers/app";
import { loginAsAdminViaModal, logout } from "../helpers/auth";
import { E2E_FIXTURES } from "../../scripts/e2e-reset-db";

test.describe("admin auth", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await waitForAppBoot(page);
  });

  test("login via modal", async ({ page }) => {
    await loginAsAdminViaModal(page);
    await expect(page.getByRole("button", { name: /editor/i })).toBeVisible();
    await logout(page);
  });

  test("bad password shows error", async ({ page }) => {
    await page.goto("/?editor=login");
    await page.getByLabel("Username").fill(E2E_FIXTURES.users.admin);
    await page.getByLabel("Password").fill("not-the-password");
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page.getByText(/invalid|password/i)).toBeVisible();
  });

  test("disabled user cannot login", async ({ page }) => {
    const password =
      process.env.E2E_ADMIN_PASSWORD ?? "e2e-test-password-change-me";
    await page.goto("/?editor=login");
    await page.getByLabel("Username").fill(E2E_FIXTURES.users.disabled);
    await page.getByLabel("Password").fill(password);
    await page.getByRole("button", { name: /sign in/i }).click();
    await expect(page.getByText(/invalid|password/i)).toBeVisible();
  });
});
