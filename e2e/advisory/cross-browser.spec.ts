import { test, expect } from "@playwright/test";
import { waitForAppBoot } from "../helpers/app";

test.describe("cross browser smoke @advisory", () => {
  test("homepage boots on webkit", async ({ page, browserName }) => {
    test.skip(browserName !== "webkit", "webkit advisory only");
    await page.goto("/");
    await waitForAppBoot(page);
    await expect(page.locator(".campus-browse-chips")).toBeVisible();
  });
});
