import { test } from "@playwright/test";
import { waitForAppBoot } from "../helpers/app";

test.describe("offline boot @advisory", () => {
  test("reload after offline still boots map", async ({ page, context }) => {
    await page.goto("/");
    await waitForAppBoot(page);
    await context.setOffline(true);
    await page.reload();
    await page.waitForTimeout(3000);
    await context.setOffline(false);
    await page.reload();
    await waitForAppBoot(page);
  });
});
