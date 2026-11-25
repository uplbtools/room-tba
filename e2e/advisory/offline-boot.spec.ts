import { expect, test } from "@playwright/test";
import { waitForAppBoot } from "../helpers/app";

test.describe("offline boot @advisory", () => {
  test("reload after offline still boots map", async ({ page, context }) => {
    test.setTimeout(180_000);
    await page.goto("/");
    await waitForAppBoot(page);
    await page.evaluate(() =>
      navigator.serviceWorker.ready.then(() => undefined),
    );
    await page.reload();
    await waitForAppBoot(page);
    await expect
      .poll(() =>
        page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
      )
      .toBe(true);
    await context.setOffline(true);
    await page.reload();
    await waitForAppBoot(page);
    await expect(page.locator("#app-boot-error")).toHaveCount(0);
    await context.setOffline(false);
    await page.reload();
    await waitForAppBoot(page);
  });
});
