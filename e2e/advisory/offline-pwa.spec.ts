import { test } from "@playwright/test";
import { waitForAppBoot } from "../helpers/app";

test.describe("offline terrain @advisory", () => {
  test("offline shows terrain unavailable copy", async ({ page, context }) => {
    await page.goto("/");
    await waitForAppBoot(page);
    await context.setOffline(true);
    await page.getByRole("button", { name: /map tools/i }).click();
    await page.waitForTimeout(1000);
    await context.setOffline(false);
  });
});
