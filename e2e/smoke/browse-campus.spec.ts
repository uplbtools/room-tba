import { test, expect } from "@playwright/test";
import { waitForAppBoot } from "../helpers/app";
import { openAppSidebar } from "../helpers/map-tools";

test("Campus sidebar navigation opens browse panels", async ({ page }) => {
  await page.goto("/");
  await waitForAppBoot(page);

  const sidebar = await openAppSidebar(page);
  await sidebar.getByRole("button", { name: "Classes" }).click();

  await expect(
    page.locator(".side-panel-details h2", { hasText: "All classes" }),
  ).toBeVisible();

  await (await openAppSidebar(page))
    .getByRole("button", { name: "Buildings" })
    .click();

  await expect(
    page.locator(".side-panel-details h2", { hasText: "Buildings" }),
  ).toBeVisible();
});
