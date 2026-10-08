import { test, expect } from "@playwright/test";
import { campusSearchBox, waitForAppBoot } from "../helpers/app";

test.describe("staging live boot", () => {
  test("homepage loads", async ({ page }) => {
    await page.goto("/");
    await waitForAppBoot(page);
    await expect(campusSearchBox(page)).toBeVisible();
  });

  test("/admin serves the landing page", async ({ page }) => {
    await page.goto("/admin");
    await expect(page.getByText("Who can do what")).toBeVisible();
    await expect(page.getByRole("link", { name: "Sign in" })).toHaveAttribute(
      "href",
      "/?editor=login",
    );
  });
});
