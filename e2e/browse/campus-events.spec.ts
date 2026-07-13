import { test, expect } from "@playwright/test";
import { waitForAppBoot } from "../helpers/app";
import { openAppSidebar } from "../helpers/map-tools";

test.describe("campus events", () => {
  test("events browse reachable", async ({ page }) => {
    await page.goto("/");
    await waitForAppBoot(page);
    const sidebar = await openAppSidebar(page);
    await sidebar.getByRole("button", { name: "Events" }).click();
    await expect(page.getByText(/event/i).first()).toBeVisible({
      timeout: 10_000,
    });
  });
});
