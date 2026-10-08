import { test, expect } from "@playwright/test";
import {
  MESSENGER_CONTRIBUTE_TARGET,
  MESSENGER_MAINTAIN_TARGET,
} from "../../src/constants/community-links.ts";

test.describe("community redirects", () => {
  test("/messenger/contribute redirects to contributors Messenger GC", async ({
    request,
  }) => {
    const res = await request.get("/messenger/contribute", {
      maxRedirects: 0,
    });
    expect(res.status()).toBeGreaterThanOrEqual(300);
    expect(res.status()).toBeLessThan(400);
    expect(res.headers().location).toBe(MESSENGER_CONTRIBUTE_TARGET);
  });

  test("/messenger/contribute navigates to Messenger in browser", async ({
    page,
  }) => {
    await page.goto("/messenger/contribute");
    // m.me redirects to www.messenger.com in real browsers.
    await expect(page).toHaveURL(/\/j\/Aba1V0prvQyLrafZ/);
  });

  test("/messenger/maintain redirects to maintainers Messenger GC", async ({
    request,
  }) => {
    const res = await request.get("/messenger/maintain", {
      maxRedirects: 0,
    });
    expect(res.status()).toBeGreaterThanOrEqual(300);
    expect(res.status()).toBeLessThan(400);
    expect(res.headers().location).toBe(MESSENGER_MAINTAIN_TARGET);
  });

  test("/maintain redirects to maintainers Messenger GC", async ({
    request,
  }) => {
    const res = await request.get("/maintain", { maxRedirects: 0 });
    expect(res.status()).toBeGreaterThanOrEqual(300);
    expect(res.status()).toBeLessThan(400);
    expect(res.headers().location).toBe(MESSENGER_MAINTAIN_TARGET);
  });
});

const TRANSPARENCY_TARGET = "https://www.uplb.tools/transparency";

/**
 * The money report used to be src/pages/transparency.astro and now lives on the
 * org site. Both old paths were linked from donate, the wiki index, and posts
 * elsewhere, so they have to keep resolving. A redirect nobody tests is a
 * redirect that breaks quietly.
 */
test.describe("transparency report redirects", () => {
  for (const path of ["/transparency", "/wiki/transparency"]) {
    test(`${path} redirects to the org site`, async ({ request }) => {
      const res = await request.get(path, { maxRedirects: 0 });
      expect(res.status()).toBeGreaterThanOrEqual(300);
      expect(res.status()).toBeLessThan(400);
      expect(res.headers().location).toBe(TRANSPARENCY_TARGET);
    });
  }
});

test.describe("admin redirects", () => {
  // The app consumes ?editor=login (opens the dialog, then cleans the URL),
  // so asserting the browser URL raced that cleanup. Check the redirect
  // itself, then that the login dialog opened.
  test("/admin/login redirects to in-app login", async ({ page, request }) => {
    const res = await request.get("/admin/login", { maxRedirects: 0 });
    expect(res.status()).toBe(302);
    expect(res.headers().location).toMatch(/editor=login/);

    await page.goto("/admin/login");
    await expect(page.locator("#admin-login-title")).toBeVisible();
  });

  // /admin itself is the landing page now (auth audit item 15); signed out
  // it links to the same in-app login.
  test("/admin links signed-out visitors to in-app login", async ({ page }) => {
    await page.goto("/admin");
    await page.getByRole("link", { name: "Sign in" }).click();
    await expect(page.locator("#admin-login-title")).toBeVisible();
  });

  test("/?editor=login opens login dialog", async ({ page }) => {
    await page.goto("/?editor=login");
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.locator("#admin-login-title")).toBeVisible();
  });
});
