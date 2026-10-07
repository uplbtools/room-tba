import { test, expect } from "@playwright/test";
import { waitForAppBoot } from "../helpers/app";
import { openAppMenu } from "../helpers/map-tools";

test.describe("App Menu", () => {
  test("contributors exposes the core community entries", async ({ page }) => {
    await page.goto("/");
    await waitForAppBoot(page);

    const menu = await openAppMenu(page);
    await expect(
      menu.getByRole("button", { name: /leaderboard/i }),
    ).toBeVisible();
    // One Sign in per layout: the menu row on phones, the top-bar button on
    // desktop (the menu then leaves it out).
    const signIn = page.getByRole("button", { name: /^sign in$/i });
    await expect(signIn).toHaveCount(1);
    await expect(signIn).toBeVisible();
  });

  test("opens the contributor leaderboard", async ({ page }) => {
    await page.goto("/");
    await waitForAppBoot(page);

    const menu = await openAppMenu(page);
    await menu.getByRole("button", { name: /leaderboard/i }).click();
    await expect(
      page.getByRole("dialog", { name: "Contributor leaderboard" }),
    ).toBeVisible();
  });

  test("What's new opens the full changelog in one click", async ({ page }) => {
    await page.goto("/");
    await waitForAppBoot(page);

    const menu = await openAppMenu(page);
    await menu.getByRole("button", { name: /what's new/i }).click();
    const modal = page.getByRole("dialog", { name: "What's new" });
    await expect(modal).toBeVisible();

    // The changelog content itself must render in the modal — no second
    // "Full changelog" click (#5). Expect several release headings.
    const versions = modal.getByRole("heading", { level: 3 });
    await expect(versions.first()).toHaveText(/^v\d+\.\d+\.\d+/);
    expect(await versions.count()).toBeGreaterThan(1);
  });

  test("keeps live presence in the footer, never as a placeholder", async ({
    page,
  }) => {
    await page.goto("/");
    await waitForAppBoot(page);
    const menu = await openAppMenu(page);

    // Hidden until someone besides you is online ("--" and "1 online" read
    // as a dead app); when shown it is a status line in the footer, not the
    // first row.
    await expect(menu.getByText("--", { exact: true })).toHaveCount(0);
    const counters = menu.locator(".online-counter");
    await expect(counters).toHaveCount(
      await menu.locator(".app-menu__footer .online-counter").count(),
    );
    if ((await counters.count()) > 0) {
      await expect(counters).toHaveRole("status");
      await expect(counters).toHaveText(/\d+ people online now/);
    }
  });

  test("Settings opens from the support section", async ({ page }) => {
    await page.goto("/");
    await waitForAppBoot(page);

    const menu = await openAppMenu(page);
    await menu.getByRole("button", { name: "Settings", exact: true }).click();
    const modal = page.getByRole("dialog", { name: "Settings" });
    await expect(modal).toBeVisible();
  });

  test("offline maps opens from the support section", async ({ page }) => {
    await page.goto("/");
    await waitForAppBoot(page);

    const menu = await openAppMenu(page);
    await menu.getByRole("button", { name: "Offline maps" }).click();
    await expect(
      page.getByRole("dialog", { name: "Offline maps" }),
    ).toBeVisible();
  });
});
