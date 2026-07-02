import type { Page } from "@playwright/test";
import { E2E_FIXTURES } from "../../scripts/e2e-reset-db";
import { waitForAppBoot } from "./app";
import { loginAsAdmin, loginViaApi, logout } from "./auth";

export { loginAsAdmin, logout };

export async function loginAs(
  page: Page,
  username: string,
  password = process.env.E2E_ADMIN_PASSWORD ?? "e2e-test-password-change-me",
) {
  await loginViaApi(page, username, password);
  await waitForAppBoot(page);
}

export async function loginAsContributor(page: Page) {
  await loginAs(page, E2E_FIXTURES.users.contributor);
}

export async function loginAsEditor(page: Page) {
  await loginAs(page, E2E_FIXTURES.users.editor);
}
