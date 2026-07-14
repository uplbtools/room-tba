import { test, expect } from "@playwright/test";
import { suppressLandingModal, waitForAppBoot } from "../helpers/app";
import { openAppSidebar } from "../helpers/map-tools";

// /final-exams is a deep link that must open the Final Exams screen directly.
// Same trap set as /planner: bare island props, trailing slash, SW denylist
// (see planner-route.spec.ts). Full-screen dialog, so wait on the loading
// shell detaching rather than waitForAppBoot (which needs the map).
async function waitForScreenBoot(page: import("@playwright/test").Page) {
  const shell = page.locator("#app-loading-shell");
  if ((await shell.count()) > 0) {
    await shell.waitFor({ state: "detached", timeout: 120_000 });
  }
}

test.describe("final exams route", () => {
  test("/final-exams opens the Final Exams screen", async ({ page }) => {
    await suppressLandingModal(page);
    await page.goto("/final-exams");
    await waitForScreenBoot(page);

    const screen = page.getByRole("dialog", { name: "Final Exams" });
    await expect(screen).toBeVisible();
    await expect(
      screen.getByRole("searchbox", { name: "Filter final exams" }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/final-exams(\/|\?|$)/);
  });

  test("opening finals from the sidebar updates the URL to /final-exams", async ({
    page,
  }) => {
    await suppressLandingModal(page);
    await page.goto("/");
    // Full boot (map + chrome): openAppSidebar needs the App menu button.
    await waitForAppBoot(page);

    // Mobile keeps the sidebar rail retracted behind the app menu.
    const sidebar = await openAppSidebar(page);
    await sidebar
      .getByRole("button", { name: "Final exams" })
      .click({ timeout: 60_000 });
    await expect(
      page.getByRole("dialog", { name: "Final Exams" }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/final-exams(\?|$)/);
  });
});
