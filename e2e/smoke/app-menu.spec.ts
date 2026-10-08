import { test, expect } from "@playwright/test";
import { waitForAppBoot } from "../helpers/app";
import { openAppMenu } from "../helpers/map-tools";

test.describe("You", () => {
  test("contributors exposes the core community entries", async ({ page }) => {
    await page.goto("/");
    await waitForAppBoot(page);

    const menu = await openAppMenu(page);
    await expect(
      menu.getByRole("button", { name: /leaderboard/i }),
    ).toBeVisible();
    // One Sign in per layout: the You row, on phones and desktop alike (the
    // desktop top bar shows the You avatar instead of its own button).
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

  test("Settings pushes inside You with a back arrow", async ({ page }) => {
    await page.goto("/");
    await waitForAppBoot(page);

    const menu = await openAppMenu(page);
    await menu.getByRole("button", { name: "Settings", exact: true }).click();
    await expect(menu.getByRole("heading", { name: "Settings" })).toBeVisible();
    await menu.getByRole("button", { name: "Back" }).click();
    await expect(menu.getByRole("heading", { name: "You" })).toBeVisible();
  });

  test("offline maps, resync and reset share one screen", async ({ page }) => {
    await page.goto("/");
    await waitForAppBoot(page);

    const menu = await openAppMenu(page);
    await menu.getByRole("button", { name: "Offline maps & storage" }).click();
    await expect(
      menu.getByRole("heading", { name: "Offline maps & storage" }),
    ).toBeVisible();
    await expect(menu.getByRole("button", { name: "Resync" })).toBeVisible();
    await expect(
      menu.getByRole("button", { name: "Reset offline data" }),
    ).toBeVisible();
  });
});
