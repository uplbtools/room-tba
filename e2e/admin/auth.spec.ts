import { test, expect } from "@playwright/test";
import { waitForAppBoot } from "../helpers/app";
import { loginAsAdminViaModal, loginViaApi, logout } from "../helpers/auth";
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
    await page.getByLabel("Password", { exact: true }).fill("not-the-password");
    await page
      .locator("form.login-body")
      .getByRole("button", { name: /^sign in$/i })
      .click();
    await expect(page.locator("#admin-login-error")).toBeVisible();
  });

  test("disabled user cannot login", async ({ page }) => {
    const password =
      process.env.E2E_ADMIN_PASSWORD ?? "e2e-test-password-change-me";
    await page.goto("/?editor=login");
    await page.getByLabel("Username").fill(E2E_FIXTURES.users.disabled);
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page
      .locator("form.login-body")
      .getByRole("button", { name: /^sign in$/i })
      .click();
    await expect(page.locator("#admin-login-error")).toBeVisible();
  });

  test("a blank-username shared-password login is refused while an admin exists", async ({
    page,
  }) => {
    const status = await page.evaluate(async () => {
      const form = new FormData();
      form.set("username", "");
      form.set("password", "any-shared-admin-password");
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        body: form,
        credentials: "same-origin",
      });
      return res.status;
    });
    expect(status).toBe(400);
  });

  test("sign out of all devices revokes cookies issued before", async ({
    page,
    context,
  }) => {
    await loginViaApi(page, E2E_FIXTURES.users.contributor);
    const cookies = await context.cookies();
    const session = cookies.find((cookie) => cookie.name === "admin_session");
    expect(session).toBeDefined();

    const status = await page.evaluate(async () => {
      const res = await fetch("/api/account/sign-out-everywhere", {
        method: "POST",
        credentials: "same-origin",
      });
      return res.status;
    });
    expect(status).toBe(200);

    // Replaying the old cookie (another device) no longer signs anyone in.
    await context.addCookies([session!]);
    const loggedIn = await page.evaluate(async () => {
      const res = await fetch("/api/admin/auth", {
        credentials: "same-origin",
      });
      return ((await res.json()) as { loggedIn?: boolean }).loggedIn;
    });
    expect(loggedIn).toBe(false);
  });

  test("verify-email page explains a missing or bad link", async ({ page }) => {
    await page.goto("/verify-email", { waitUntil: "domcontentloaded" });
    await expect(page.getByText("This link is incomplete.")).toBeVisible();

    await page.goto("/verify-email?token=not-a-real-token", {
      waitUntil: "domcontentloaded",
    });
    // The token leaves the address bar as soon as the page reads it.
    await expect(page).toHaveURL(/\/verify-email$/);
    await page.getByRole("button", { name: "Confirm email" }).click();
    await expect(page.getByText(/invalid or has expired/)).toBeVisible();
  });
});
