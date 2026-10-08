import { expect, test } from "@playwright/test";
import { suppressLandingModal, waitForAppBoot } from "../helpers/app";

const OFFLINE_TEXT = "You’re offline — showing saved data";

test.describe("offline banner @advisory", () => {
  test("shows while offline, dismisses, and comes back on the next drop", async ({
    page,
    context,
  }) => {
    await suppressLandingModal(page);
    await page.goto("/");
    await waitForAppBoot(page);

    const banner = page.getByText(OFFLINE_TEXT);
    await expect(banner).toHaveCount(0);

    await context.setOffline(true);
    await expect(banner).toBeVisible();

    await page.getByRole("button", { name: "Dismiss offline notice" }).click();
    await expect(banner).toHaveCount(0);

    await context.setOffline(false);
    await context.setOffline(true);
    await expect(banner).toBeVisible();
    await context.setOffline(false);
  });

  test("an offline reload keeps the banner and opens /planner from the app shell", async ({
    page,
    context,
  }) => {
    await suppressLandingModal(page);
    await page.goto("/");
    await waitForAppBoot(page);
    // The worker must control the page before an offline navigation can be
    // answered from its precache.
    await page.evaluate(async () => {
      await navigator.serviceWorker.ready;
    });
    await page.reload();
    await waitForAppBoot(page);

    await context.setOffline(true);
    await page.reload();
    await expect(page.getByText(OFFLINE_TEXT)).toBeVisible({ timeout: 30_000 });

    await page.goto("/planner");
    await expect(
      page.getByRole("dialog", { name: "Class Planner" }),
    ).toBeVisible({ timeout: 30_000 });
    await context.setOffline(false);
  });
});
