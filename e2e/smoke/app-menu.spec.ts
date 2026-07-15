import { test, expect } from "@playwright/test";
import { waitForAppBoot } from "../helpers/app";
import {
  openAppSidebar,
  openHelpSettingsSection,
  clickSidebarNav,
} from "../helpers/map-tools";

test.describe("sidebar support menus", () => {
  async function openSection(
    page: import("@playwright/test").Page,
    name: "Contributors" | "Help & settings",
  ) {
    const sidebar = await openAppSidebar(page);
    if (name === "Help & settings") {
      await openHelpSettingsSection(sidebar);
    } else {
      await clickSidebarNav(sidebar, name);
    }
    return sidebar;
  }

  test("contributors exposes the core community entries", async ({ page }) => {
    await page.goto("/");
    await waitForAppBoot(page);

    const sidebar = await openSection(page, "Contributors");
    await expect(
      sidebar.getByRole("button", { name: /leaderboard/i }),
    ).toBeVisible();
    await expect(sidebar.getByRole("button", { name: "Login" })).toBeVisible();
  });

  test("What's new opens the full changelog in one click", async ({ page }) => {
    await page.goto("/");
    await waitForAppBoot(page);

    const sidebar = await openSection(page, "Help & settings");
    await clickSidebarNav(sidebar, /what's new/i);
    const modal = page.getByRole("dialog", { name: "What's new" });
    await expect(modal).toBeVisible();

    // The changelog content itself must render in the modal — no second
    // "Full changelog" click (#5). Expect several release headings.
    const versions = modal.getByRole("heading", { level: 3 });
    await expect(versions.first()).toHaveText(/^v\d+\.\d+\.\d+/);
    expect(await versions.count()).toBeGreaterThan(1);
  });

  test("Settings opens from the support section", async ({ page }) => {
    await page.goto("/");
    await waitForAppBoot(page);

    const sidebar = await openSection(page, "Help & settings");
    await clickSidebarNav(sidebar, "Settings", { exact: true });
    const modal = page.getByRole("dialog", { name: "Settings" });
    await expect(modal).toBeVisible();
  });

  test("offline maps opens from the support section", async ({ page }) => {
    await page.goto("/");
    await waitForAppBoot(page);

    const sidebar = await openSection(page, "Help & settings");
    await clickSidebarNav(sidebar, "Offline maps");
    await expect(
      page.getByRole("dialog", { name: "Offline maps" }),
    ).toBeVisible();
  });
});
