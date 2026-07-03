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
    await expect(page).toHaveURL(/m\.me\/j\/Aba1V0prvQyLrafZ/);
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
