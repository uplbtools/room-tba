import type { Page } from "@playwright/test";
import { E2E_FIXTURES } from "../../scripts/e2e-reset-db";
import { loginAsAdmin, logout } from "./auth";

export { loginAsAdmin, logout };

export async function loginAs(
  page: Page,
  username: string,
  password = process.env.E2E_ADMIN_PASSWORD ?? "e2e-test-password-change-me",
) {
  await page.goto("/?editor=login");
  await page.getByLabel("Username").fill(username);
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: /sign in/i }).click();
  await page.getByText(/Logged in as/i).waitFor({ timeout: 15_000 });
}

export async function loginAsContributor(page: Page) {
  await loginAs(page, E2E_FIXTURES.users.contributor);
}

export async function loginAsEditor(page: Page) {
  await loginAs(page, E2E_FIXTURES.users.editor);
}
