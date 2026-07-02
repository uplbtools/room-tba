import { expect, type Page } from "@playwright/test";
import { E2E_FIXTURES } from "../../scripts/e2e-reset-db";
import { waitForAppBoot } from "./app";

const DEFAULT_PASSWORD =
  process.env.E2E_ADMIN_PASSWORD ?? "e2e-test-password-change-me";

async function readLoggedIn(page: Page): Promise<boolean> {
  return page.evaluate(async () => {
    const res = await fetch("/api/admin/auth", { credentials: "same-origin" });
    if (!res.ok) return false;
    const data = (await res.json()) as { loggedIn?: boolean };
    return data.loggedIn === true;
  });
}

export async function waitForLoggedIn(page: Page, timeout = 15_000) {
  await expect.poll(() => readLoggedIn(page), { timeout }).toBe(true);
}

/** Fast in-page login — same-origin fetch avoids CSRF blocks on page.request. */
export async function loginViaApi(
  page: Page,
  username: string,
  password = DEFAULT_PASSWORD,
) {
  const result = await page.evaluate(
    async ({ username, password }) => {
      const formData = new FormData();
      formData.set("username", username);
      formData.set("password", password);
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        body: formData,
        credentials: "same-origin",
      });
      return { ok: res.ok, status: res.status, body: await res.text() };
    },
    { username, password },
  );
  if (!result.ok) {
    throw new Error(`Login failed (${result.status}): ${result.body}`);
  }
  await waitForLoggedIn(page);
  // Cookie is set but Svelte adminAuthStore only hydrates on load / modal login.
  await page.reload({ waitUntil: "domcontentloaded" });
  await waitForLoggedIn(page);
}

export async function loginAsAdmin(page: Page) {
  await loginViaApi(page, E2E_FIXTURES.users.admin);
  await waitForAppBoot(page);
  await expect(
    page.getByRole("button", { name: /open editor tools/i }),
  ).toBeVisible({ timeout: 15_000 });
}

/** Exercises the in-app login modal (auth.spec only). */
export async function loginAsAdminViaModal(page: Page) {
  await page.goto("/?editor=login", { waitUntil: "domcontentloaded" });
  await page
    .getByLabel("Username")
    .waitFor({ state: "visible", timeout: 30_000 });
  await page.getByLabel("Username").fill(E2E_FIXTURES.users.admin);
  await page.getByLabel("Password").fill(DEFAULT_PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();
  await waitForLoggedIn(page);
}

export async function logout(page: Page) {
  await page.evaluate(async () => {
    await fetch("/api/admin/auth", {
      method: "DELETE",
      credentials: "same-origin",
    });
  });
}
