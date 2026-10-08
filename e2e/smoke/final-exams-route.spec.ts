import { test, expect } from "@playwright/test";
import { suppressLandingModal, waitForAppBoot } from "../helpers/app";
import { openDestination } from "../helpers/map-tools";

// /final-exams is a deep link that must open the Final exams screen directly.
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
  test("/final-exams opens the Final exams screen", async ({ page }) => {
    await suppressLandingModal(page);
    await page.goto("/final-exams");
    await waitForScreenBoot(page);

    const screen = page.getByRole("dialog", { name: "Final exams" });
    await expect(screen).toBeVisible();
    // The filter only renders once there are exams; an empty term shows the
    // empty state with its calendar action instead.
    await expect(
      screen
        .getByRole("searchbox", { name: "Filter final exams" })
        .or(screen.getByRole("button", { name: "See academic calendar" })),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/final-exams(\/|\?|$)/);
  });

  test("opening finals from You updates the URL to /final-exams", async ({
    page,
  }) => {
    await suppressLandingModal(page);
    await page.goto("/");
    await waitForAppBoot(page);

    await openDestination(page, /^final exams$/i);
    await expect(
      page.getByRole("dialog", { name: "Final exams" }),
    ).toBeVisible();
    await expect(page).toHaveURL(/\/final-exams(\?|$)/);
  });
});
