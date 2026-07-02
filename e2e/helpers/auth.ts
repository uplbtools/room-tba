import type { Page } from "@playwright/test";
import { E2E_FIXTURES } from "../../scripts/e2e-reset-db";

export async function loginAsAdmin(page: Page) {
  const password =
    process.env.E2E_ADMIN_PASSWORD ?? "e2e-test-password-change-me";
  await page.goto("/?editor=login");
  await page.getByLabel("Username").fill(E2E_FIXTURES.users.admin);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.getByText(/Logged in as/i).waitFor({ timeout: 15_000 });
}

export async function logout(page: Page) {
  await page.evaluate(async () => {
    await fetch("/api/admin/auth", {
      method: "DELETE",
      credentials: "same-origin",
    });
  });
}
