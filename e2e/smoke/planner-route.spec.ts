import { test, expect } from "@playwright/test";
import { suppressLandingModal } from "../helpers/app";

// /planner is a deep link that must open the Class Planner overlay directly.
// Without a blocking e2e this route silently breaks (cf. app-menu regressions).
// The planner is a full-screen dialog that covers the map chrome, so we wait on
// the loading shell detaching rather than waitForAppBoot (which needs the map).
async function waitForPlannerBoot(page: import("@playwright/test").Page) {
  const shell = page.locator("#app-loading-shell");
  if ((await shell.count()) > 0) {
    await shell.waitFor({ state: "detached", timeout: 120_000 });
  }
}

test.describe("planner route", () => {
  test("/planner opens the Class Planner with the change-of-matriculation disclaimer", async ({
    page,
  }) => {
    await suppressLandingModal(page);
    await page.goto("/planner");
    await waitForPlannerBoot(page);

    const planner = page.getByRole("dialog", { name: "Class Planner" });
    await expect(planner).toBeVisible();
    await expect(planner.getByText(/change of matriculation/i)).toBeVisible();
  });

  test("/planner?term still opens the planner", async ({ page }) => {
    await suppressLandingModal(page);
    await page.goto("/planner?term=1252");
    await waitForPlannerBoot(page);

    await expect(
      page.getByRole("dialog", { name: "Class Planner" }),
    ).toBeVisible();
  });
});
